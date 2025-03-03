import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
import hashlib
import json
import os
import logging
import pytz
import re
import time
from typing import List, Dict, Optional, Tuple

from ..scrapers.base_scraper import BaseScraper
from ..models import Event, EventMetadata, EventStatus, EventCategory, Price, Organizer, Venue

class NYCGovScraper(BaseScraper):
    def __init__(self):
        super().__init__("nycgov")
        self.base_url = "https://api.nyc.gov/calendar/search"
        self.headers = {
            "Accept": "*/*",
            "Accept-Language": "en-US,en;q=0.9",
            "Connection": "keep-alive",
            "Ocp-Apim-Subscription-Key": "3a3248a64bcf44c88984fae3e745c0d7",
            "Origin": "https://www.nyc.gov",
            "Referer": "https://www.nyc.gov/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
            "sec-ch-ua": '"Not(A:Brand";v="99", "Microsoft Edge";v="133", "Chromium";v="133"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"'
        }
        
        # Define categories to scrape
        self.categories = [
            "Kids and Family",
            "Street and Neighborhood",
            "Arts and Music",
            "Civic Engagement",
            "Health",
            "Parks and Recreation",
            "Programs and Workshops"
        ]
        
        # Default organizer for NYC.gov events
        self.default_organizer = Organizer(
            name="NYC Government",
            website="https://www.nyc.gov",
            email="info@nyc.gov"
        )
        
        # Borough information
        self.borough_info = {
            'Brooklyn': {
                'latitude': 40.6782,
                'longitude': -73.9442
            },
            'Manhattan': {
                'latitude': 40.7831,
                'longitude': -73.9712
            },
            'Queens': {
                'latitude': 40.7282,
                'longitude': -73.7949
            },
            'Bronx': {
                'latitude': 40.8448,
                'longitude': -73.8648
            },
            'Staten Island': {
                'latitude': 40.5795,
                'longitude': -74.1502
            }
        }
    
    def _get_date_range(self) -> Dict[str, str]:
        """Get start and end dates in the required format."""
        today = datetime.now()
        end_date = today + timedelta(days=365)  # Look ahead 1 year
        
        return {
            'startDate': today.strftime('%m/%d/%Y %I:%M %p'),
            'endDate': end_date.strftime('%m/%d/%Y %I:%M %p')
        }
    
    def _parse_time_part(self, time_part: str) -> Tuple[Optional[str], Optional[str]]:
        """Parse time part string into start and end times."""
        if not time_part:
            return None, None
            
        # Common patterns: "10am to 6pm", "2:30pm to 4pm", "All Day"
        if time_part.lower() == "all day":
            return "12:00 AM", "11:59 PM"
            
        match = re.search(r'(\d+(?::\d+)?(?:am|pm))\s+to\s+(\d+(?::\d+)?(?:am|pm))', time_part.lower())
        if match:
            return match.group(1), match.group(2)
        
        return None, None
    
    def _parse_datetime(self, date_part: str, time_part: str) -> Optional[datetime]:
        """Convert date and time parts into datetime object."""
        if not date_part:
            return None
            
        try:
            # Parse date part (e.g., "Feb 15")
            date_obj = datetime.strptime(date_part, '%b %d')
            # Add current year
            date_obj = date_obj.replace(year=datetime.now().year)
            
            # If date is in past, assume next year
            if date_obj.date() < datetime.now().date():
                date_obj = date_obj.replace(year=date_obj.year + 1)
                
            if time_part:
                start_time, _ = self._parse_time_part(time_part)
                if start_time:
                    try:
                        time_obj = datetime.strptime(start_time, '%I:%M %p').time()
                        date_obj = date_obj.replace(hour=time_obj.hour, minute=time_obj.minute)
                    except ValueError:
                        try:
                            time_obj = datetime.strptime(start_time, '%I%p').time()
                            date_obj = date_obj.replace(hour=time_obj.hour, minute=time_obj.minute)
                        except ValueError:
                            pass
            
            # Convert to UTC
            et = pytz.timezone('America/New_York')
            return et.localize(date_obj).astimezone(pytz.utc)
            
        except Exception as e:
            self.logger.error(f"Error parsing datetime: {str(e)}")
            return None
    
    def _clean_html(self, text: str) -> str:
        """Clean HTML from text."""
        if not text:
            return ""
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', text)
        # Fix escaped HTML entities
        text = text.replace('\\"', '"').replace('\\/', '/')
        return text.strip()
    
    def _get_borough_name(self, code: str) -> str:
        """Convert borough code to full name."""
        borough_map = {
            'Bk': 'Brooklyn',
            'Mn': 'Manhattan',
            'Qn': 'Queens',
            'Bx': 'Bronx',
            'Si': 'Staten Island',
            'Ot': 'Other'
        }
        return borough_map.get(code, code)
    
    def _determine_category(self, nyc_category: str) -> EventCategory:
        """Map NYC.gov categories to our standard categories."""
        category_map = {
            "Arts and Music": EventCategory.ART,
            "Kids and Family": EventCategory.FAMILY,
            "Street and Neighborhood": EventCategory.COMMUNITY,
            "Civic Engagement": EventCategory.COMMUNITY,
            "Health": EventCategory.WELLNESS,
            "Parks and Recreation": EventCategory.PARKS,
            "Programs and Workshops": EventCategory.LEARNING
        }
        return category_map.get(nyc_category, EventCategory.OTHER)
    
    def _create_venue(self, item: Dict) -> Venue:
        """Create a venue object from event data."""
        address = item.get('address', '')
        boroughs = [self._get_borough_name(b) for b in item.get('boroughs', [])]
        borough = boroughs[0] if boroughs else None
        
        # Get coordinates for the borough
        lat, lon = None, None
        if borough and borough in self.borough_info:
            lat = self.borough_info[borough]['latitude']
            lon = self.borough_info[borough]['longitude']
        
        return Venue(
            name=address,
            address=address,
            type=item.get('addressType', 'Venue'),
            latitude=lat,
            longitude=lon
        )
    
    def _process_event(self, item: Dict, category: str) -> Optional[Event]:
        """Process a single event from the API response."""
        try:
            # Generate unique ID
            id_string = f"{item['name']}{item.get('datePart', '')}{item.get('timePart', '')}".encode()
            event_id = self.generate_event_id(item['name'], item.get('datePart', ''))
            
            # Parse dates
            start_date = self._parse_datetime(item.get('datePart'), item.get('timePart'))
            if not start_date:
                return None
            
            # For end date, use start date if not provided
            end_date = start_date
            if item.get('timePart'):
                _, end_time = self._parse_time_part(item['timePart'])
                if end_time:
                    try:
                        time_obj = datetime.strptime(end_time, '%I:%M %p').time()
                        end_date = datetime.combine(start_date.date(), time_obj)
                        # Convert to UTC
                        et = pytz.timezone('America/New_York')
                        end_date = et.localize(end_date).astimezone(pytz.utc)
                    except ValueError:
                        try:
                            time_obj = datetime.strptime(end_time, '%I%p').time()
                            end_date = datetime.combine(start_date.date(), time_obj)
                            end_date = et.localize(end_date).astimezone(pytz.utc)
                        except ValueError:
                            pass
            
            # Get full borough names
            boroughs = [self._get_borough_name(b) for b in item.get('boroughs', [])]
            
            # Clean description
            description = self._clean_html(item.get('desc', item.get('shortDesc', '')))
            
            # Create venue
            venue = self._create_venue(item)
            
            # Create metadata
            metadata = EventMetadata(
                source_url=item.get('permalink'),
                source_name=self.source_name,
                organizer=self.default_organizer,
                venue=venue
            )
            
            # Create tags
            tags = [
                category.lower(),
                item.get('agencyName', '').lower(),
                *[b.lower() for b in boroughs]
            ]
            
            # Add category-specific tags
            if category == "Kids and Family":
                tags.extend(["children", "family events"])
            elif category == "Street and Neighborhood":
                tags.extend(["community", "street events", "neighborhood"])
            
            # Create event object
            event = Event(
                id=event_id,
                name=item['name'],
                type=category,
                location_id=f"loc_nycgov_{hashlib.md5(venue.address.encode()).hexdigest()[:8]}",
                community_id="com_nyc_gov",
                description=description,
                start_date=start_date,
                end_date=end_date,
                category=self._determine_category(category),
                price=Price(
                    amount=0.0,
                    type="Free",
                    details="Free"
                ),
                registration_required=False,
                tags=tags,
                status=EventStatus.CANCELLED if item.get('canceled') else EventStatus.SCHEDULED,
                image_url=None,
                metadata=metadata
            )
            
            return event
            
        except Exception as e:
            self.logger.error(f"Error processing event: {str(e)}")
            return None
    
    def _scrape_category(self, category: str, max_pages: int = 20) -> List[Event]:
        """Scrape events for a specific category."""
        events = []
        page = 1
        
        while page <= max_pages:
            try:
                self.logger.info(f"Scraping {category} events - page {page}")
                
                # Prepare request parameters
                params = {
                    'startDate': self._get_date_range()['startDate'],
                    'endDate': self._get_date_range()['endDate'],
                    'categories': category,
                    'categoryOperator': 'OR',
                    'sort': 'DATE',
                    'pageNumber': str(page)
                }
                
                # Make request
                response = self.session.get(
                    self.base_url,
                    params=params,
                    headers=self.headers
                )
                response.raise_for_status()
                
                data = response.json()
                items = data.get('items', [])
                
                if not items:
                    self.logger.info(f"No more events found for {category}")
                    break
                
                # Process events
                for item in items:
                    event = self._process_event(item, category)
                    if event:
                        events.append(event)
                
                # Add delay between requests
                time.sleep(1)
                page += 1
                
            except Exception as e:
                self.logger.error(f"Error scraping {category} events page {page}: {str(e)}")
                break
        
        return events
    
    def run(self) -> List[Event]:
        """Run the scraper for all categories."""
        all_events = []
        
        for category in self.categories:
            try:
                self.logger.info(f"Starting to scrape {category} events")
                events = self._scrape_category(category)
                if events:
                    self.logger.info(f"Found {len(events)} {category} events")
                    all_events.extend(events)
                else:
                    self.logger.warning(f"No events found for {category}")
            except Exception as e:
                self.logger.error(f"Error scraping {category} events: {str(e)}")
        
        self.logger.info(f"Successfully scraped {len(all_events)} total events")
        return all_events

def main():
    scraper = NYCGovScraper()
    scraper.run()

if __name__ == "__main__":
    main() 