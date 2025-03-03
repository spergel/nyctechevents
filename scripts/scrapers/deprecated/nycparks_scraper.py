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
from urllib.parse import urljoin

from ..scrapers.base_scraper import BaseScraper
from ..models import Event, EventMetadata, EventStatus, EventCategory, Price, Organizer, Venue

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.FileHandler('scraper.log'), logging.StreamHandler()]
)

class NYCParksScraper(BaseScraper):
    def __init__(self):
        super().__init__("nycparks")
        self.base_url = "https://www.nycgovparks.org/events"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        
        # Default organizer for NYC Parks events
        self.default_organizer = Organizer(
            name="NYC Parks",
            website="https://www.nycgovparks.org",
            email="accessibility@parks.nyc.gov"
        )
        
        # Borough coordinates and IDs for location approximation
        self.borough_info = {
            'Brooklyn': {
                'coords': (40.6782, -73.9442),
                'id': 'loc_brooklyn_parks'
            },
            'Manhattan': {
                'coords': (40.7831, -73.9712),
                'id': 'loc_manhattan_parks'
            },
            'Queens': {
                'coords': (40.7282, -73.7949),
                'id': 'loc_queens_parks'
            },
            'Bronx': {
                'coords': (40.8448, -73.8648),
                'id': 'loc_bronx_parks'
            },
            'Staten Island': {
                'coords': (40.5795, -74.1502),
                'id': 'loc_staten_island_parks'
            }
        }
        
        # Category mapping with more specific categories
        self.category_map = {
            'Art': EventCategory.ART,
            'Arts & Crafts': EventCategory.ART,
            'Volunteer': EventCategory.COMMUNITY,
            'Nature': EventCategory.PARKS,
            'Fitness': EventCategory.WELLNESS,
            'Kids': EventCategory.FAMILY,
            'Education': EventCategory.LEARNING,
            'Talks': EventCategory.LEARNING,
            'Tours': EventCategory.LEARNING,
            'History': EventCategory.LEARNING,
            'Games': EventCategory.ENTERTAINMENT,
            'Sports': EventCategory.SPORTS,
            'Dance': EventCategory.ENTERTAINMENT,
            'Theater': EventCategory.ENTERTAINMENT,
            'Music': EventCategory.ENTERTAINMENT,
            'Film': EventCategory.ENTERTAINMENT,
            'Environment': EventCategory.PARKS,
            'Birding': EventCategory.PARKS,
            'Hiking': EventCategory.PARKS,
            'Gardening': EventCategory.PARKS,
            'Festivals': EventCategory.ENTERTAINMENT,
            'Markets': EventCategory.COMMUNITY,
            'Senior': EventCategory.COMMUNITY,
            'Family': EventCategory.FAMILY,
            'Waterfront': EventCategory.PARKS
        }
    
    def _clean_text(self, text: str) -> str:
        """Clean text by removing extra whitespace and HTML entities."""
        if not text:
            return ""
        # Replace HTML entities and remove extra whitespace
        text = re.sub(r'\s+', ' ', text.replace('\u00a0', ' '))
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', text)
        return text.strip()
    
    def _parse_datetime(self, date_str: str, time_str: str) -> Optional[datetime]:
        """Parse date and time strings into datetime object."""
        try:
            # Clean up strings
            date_str = self._clean_text(date_str)
            time_str = self._clean_text(time_str)
            
            # Parse date
            date_obj = datetime.strptime(date_str, '%Y-%m-%d')
            
            # Parse time
            time_obj = self._parse_time(time_str)
            if not time_obj:
                # Default to noon if no time specified
                time_obj = datetime.strptime('12:00 PM', '%I:%M %p').time()
            
            # Combine date and time
            dt = datetime.combine(date_obj.date(), time_obj)
            
            # Add timezone
            et = pytz.timezone('America/New_York')
            return et.localize(dt).astimezone(pytz.UTC)
            
        except Exception as e:
            self.logger.error(f"Error parsing datetime: {date_str} {time_str} - {str(e)}")
            return None
    
    def _parse_time(self, time_str: str) -> Optional[datetime.time]:
        """Parse time string to datetime.time object."""
        if not time_str:
            return None
            
        # Clean up the time string
        time_str = self._clean_text(time_str)
        
        # Try different time formats
        formats = [
            '%I:%M %p',
            '%I:%M%p',
            '%H:%M',
            '%I %p',
            '%I%p'
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(time_str.strip(), fmt).time()
            except ValueError:
                continue
        
        return None
    
    def _determine_category(self, categories: List[str], title: str, description: str) -> EventCategory:
        """Map NYC Parks categories to standard categories."""
        # First check explicit categories
        for cat in categories:
            cat_lower = cat.lower()
            for key, value in self.category_map.items():
                if key.lower() in cat_lower:
                    return value
        
        # Check title and description
        text = f"{title} {description}".lower()
        for key, value in self.category_map.items():
            if key.lower() in text:
                return value
        
        # Check for additional keywords
        keyword_map = {
            EventCategory.PARKS: ['park', 'garden', 'nature', 'outdoor', 'trail'],
            EventCategory.FAMILY: ['children', 'kids', 'family', 'youth'],
            EventCategory.WELLNESS: ['health', 'fitness', 'exercise', 'yoga', 'meditation'],
            EventCategory.LEARNING: ['learn', 'workshop', 'education', 'class'],
            EventCategory.COMMUNITY: ['volunteer', 'community', 'cleanup', 'service']
        }
        
        for category, keywords in keyword_map.items():
            if any(keyword in text for keyword in keywords):
                return category
        
        return EventCategory.PARKS  # Default for NYC Parks events
    
    def _extract_categories(self, desc_text: str) -> List[str]:
        """Extract categories from description text."""
        if not desc_text:
            return []
            
        # Look for "Category:" or "Categories:" followed by comma-separated values
        category_match = re.search(r'Category(?:ies)?:\s*([^!]+)(?:Free!|$)', desc_text)
        if category_match:
            categories = [cat.strip() for cat in category_match.group(1).split(',')]
            return [cat for cat in categories if cat]
        return []
    
    def _clean_description(self, desc: str) -> str:
        """Clean and format description text."""
        if not desc:
            return ""
            
        # Remove category section
        desc = re.sub(r'Category(?:ies)?:[^!]+(?:Free!|$)', '', desc)
        
        # Clean HTML and extra whitespace
        desc = self._clean_text(desc)
        
        # Remove duplicate content
        if desc.count('.') > 1:
            first_sentence = desc.split('.')[0] + '.'
            if desc.count(first_sentence) > 1:
                desc = desc.split(first_sentence)[0] + first_sentence
        
        # Remove common prefixes
        desc = re.sub(r'^(Join us|Come|Please join|Join NYC Parks)[^\w]*', '', desc, flags=re.I)
        
        return desc.strip()
    
    def _parse_price(self, desc_text: str) -> Price:
        """Parse price information from description."""
        if not desc_text:
            return Price(amount=0.0, type="Free", details="Free")
        
        desc_lower = desc_text.lower()
        
        # Check for free events
        if 'free!' in desc_lower or 'free event' in desc_lower:
            return Price(amount=0.0, type="Free", details="Free")
        
        # Look for price amounts
        price_matches = re.findall(r'\$(\d+(?:\.\d{2})?)', desc_text)
        if price_matches:
            amount = float(price_matches[0])
            if len(price_matches) > 1:
                return Price(
                    amount=amount,
                    type="Range",
                    details=f"Prices range from ${price_matches[0]} to ${price_matches[-1]}"
                )
            return Price(
                amount=amount,
                type="Fixed",
                details=f"${amount:.2f}"
            )
        
        # Default to free for NYC Parks events
        return Price(amount=0.0, type="Free", details="Free")
    
    def _create_venue(self, location: str, details: Dict) -> Tuple[str, Venue]:
        """Create a venue object from event data."""
        address = details.get('address', location)
        
        # Extract borough from location
        borough = None
        for b in self.borough_info:
            if b in location or b in address:
                borough = b
                break
        
        # Get coordinates
        lat, lon = None, None
        if 'coordinates' in details:
            lat = details['coordinates']['latitude']
            lon = details['coordinates']['longitude']
        elif borough:
            lat, lon = self.borough_info[borough]['coords']
        
        # Generate location ID
        if borough:
            location_id = self.borough_info[borough]['id']
        else:
            # Hash the address for a consistent ID
            location_hash = hashlib.md5(address.encode()).hexdigest()[:8]
            location_id = f"loc_nycparks_{location_hash}"
        
        venue = Venue(
            name=location,
            address=address,
            type="Park",
            latitude=lat,
            longitude=lon
        )
        
        return location_id, venue
    
    def _create_event(self, event_data: Dict, details: Dict) -> Optional[Event]:
        """Create an event object from scraped data."""
        try:
            # Parse dates
            start_date = self._parse_datetime(event_data['date'], event_data['start_time'])
            if not start_date:
                return None
            
            end_date = self._parse_datetime(event_data['date'], event_data.get('end_time'))
            if not end_date:
                # Default to 2 hours if no end time
                end_date = start_date + timedelta(hours=2)
            
            # Get location info
            location_id, venue = self._create_venue(event_data['location'], details)
            
            # Extract categories
            categories = self._extract_categories(event_data['description'])
            
            # Create metadata
            metadata = EventMetadata(
                source_url=event_data['url'],
                source_name=self.source_name,
                organizer=self.default_organizer,
                venue=venue,
                additional_info={
                    'accessible': details.get('accessible', False),
                    'contact_number': details.get('contact_number'),
                    'registration_url': details.get('registration_url')
                }
            )
            
            # Create event
            event = Event(
                id=self.generate_event_id(event_data['title'], start_date.isoformat()),
                name=event_data['title'],
                type="Park Event",
                location_id=location_id,
                community_id="com_nycparks",
                description=self._clean_description(details.get('full_description', event_data['description'])),
                start_date=start_date,
                end_date=end_date,
                category=self._determine_category(categories, event_data['title'], event_data['description']),
                price=self._parse_price(event_data['description']),
                registration_required=details.get('registration_required', False),
                tags=categories,
                status=EventStatus.SCHEDULED,
                image_url=event_data.get('image_url'),
                metadata=metadata
            )
            
            return event
            
        except Exception as e:
            self.logger.error(f"Error creating event {event_data.get('title', 'Unknown')}: {str(e)}")
            return None
    
    def _get_event_details(self, event_url: str) -> Dict:
        """Fetch additional details from individual event page."""
        try:
            response = self.session.get(event_url, headers=self.headers)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            
            details = {}
            
            # Extract coordinates
            map_locations = soup.find('span', {'class': 'map_locations'})
            if map_locations:
                try:
                    coords = map_locations.get('id', '').split('__')
                    if len(coords) >= 2:
                        details['coordinates'] = {
                            'latitude': float(coords[0]),
                            'longitude': float(coords[1])
                        }
                except (ValueError, IndexError):
                    self.logger.warning(f"Could not parse coordinates from {event_url}")
            
            # Extract accessibility info
            location_div = soup.find('div', {'class': 'location'})
            if location_div:
                accessibility_img = location_div.find('img', alt=lambda x: x and 'Accessible' in x)
                details['accessible'] = bool(accessibility_img)
            
            # Extract contact number
            contact_section = soup.find(lambda tag: tag.name == 'h3' and 'Contact Number' in tag.text)
            if contact_section and contact_section.find_next('p'):
                phone = re.sub(r'\D', '', contact_section.find_next('p').text)
                details['contact_number'] = phone if phone else None
            
            # Extract registration info
            registration_section = soup.find(lambda tag: tag.name == 'h3' and 'Registration' in tag.text)
            if registration_section:
                registration_link = registration_section.find_next('p', {'class': 'registration-link'})
                if registration_link:
                    details['registration_required'] = True
                    reg_url = registration_link.find('a')['href'] if registration_link.find('a') else None
                    details['registration_url'] = reg_url if reg_url and reg_url.startswith('http') else None
                else:
                    details['registration_required'] = False
            
            # Extract full description
            desc_div = soup.find('div', {'class': 'description'})
            if desc_div:
                details['full_description'] = self._clean_description(desc_div.text)
            
            # Extract and clean address
            address_div = soup.find('div', {'itemtype': 'http://schema.org/PostalAddress'})
            if address_div:
                address = self._clean_text(address_div.text)
                # Add borough if not in address
                if location_div:
                    borough = re.search(r'in\s+([^,]+)(?:,\s*([^)]+))?', location_div.text)
                    if borough and borough.group(2) and borough.group(2) not in address:
                        address = f"{address}, {borough.group(2)}"
                details['address'] = address
            
            return details
            
        except Exception as e:
            self.logger.error(f"Error fetching event details from {event_url}: {str(e)}")
            return {}
    
    def run(self) -> List[Event]:
        """Run the scraper and return list of events."""
        events = []
        page = 1
        
        try:
            self.logger.info("Starting NYC Parks scraper")
            
            while True:
                url = f"{self.base_url}/search?page={page}"
                self.logger.info(f"Fetching page {page}")
                
                response = self.session.get(url, headers=self.headers)
                response.raise_for_status()
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Find all event cards
                event_cards = soup.find_all('div', class_='event-card')
                
                if not event_cards:
                    break
                
                for card in event_cards:
                    try:
                        # Extract basic event info
                        title = card.find('h3').text.strip()
                        event_url = urljoin(self.base_url, card.find('a')['href'])
                        date = card.find('span', class_='date').text.strip()
                        start_time = card.find('span', class_='start').text.strip()
                        end_time = card.find('span', class_='end').text.strip() if card.find('span', class_='end') else None
                        location = card.find('div', class_='location').text.strip()
                        description = card.find('div', class_='description').text.strip()
                        image = card.find('img')
                        image_url = urljoin(self.base_url, image['src']) if image else None
                        
                        event_data = {
                            'title': title,
                            'url': event_url,
                            'date': date,
                            'start_time': start_time,
                            'end_time': end_time,
                            'location': location,
                            'description': description,
                            'image_url': image_url
                        }
                        
                        # Get additional details
                        time.sleep(1)  # Be nice to the server
                        details = self._get_event_details(event_url)
                        
                        # Create event
                        event = self._create_event(event_data, details)
                        if event:
                            events.append(event)
                            
                    except Exception as e:
                        self.logger.error(f"Error processing event card: {str(e)}")
                
                page += 1
                time.sleep(2)  # Be nice to the server
            
            self.logger.info(f"Successfully scraped {len(events)} events")
            
        except Exception as e:
            self.logger.error(f"Error running NYC Parks scraper: {str(e)}")
        
        return events

def main():
    scraper = NYCParksScraper()
    scraper.run()

if __name__ == "__main__":
    main() 