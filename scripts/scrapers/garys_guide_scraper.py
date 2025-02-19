import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime, timedelta
import uuid
import os
import re
from typing import Dict, List, Optional, Tuple
import pytz
from dataclasses import dataclass
import time
from urllib.parse import urljoin
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class GarysEvent:
    """Data structure for a Gary's Guide event"""
    id: str
    name: str
    url: str
    description: str
    start_date: str
    end_date: str
    location: Dict[str, str]  # {"name": "", "address": "", "venue_type": ""}
    speakers: List[Dict[str, str]]
    price: Dict[str, any]  # {"amount": float, "type": str, "details": str}
    event_type: str
    tags: List[str]
    capacity: Optional[int]
    featured: bool

class GarysGuideScraper:
    BASE_URL = "https://www.garysguide.com"
    EVENTS_URL = f"{BASE_URL}/events?region=nyc"
    
    # Known venues and their details
    VENUE_MAPPINGS = {
        "bloomberg": {
            "id": "loc_bloomberg",
            "name": "Bloomberg HQ",
            "address": "731 Lexington Ave, New York, NY 10022",
            "type": "Corporate"
        },
        "betaworks": {
            "id": "loc_betaworks",
            "name": "Betaworks Studios",
            "address": "29 Little West 12th St, New York, NY 10014",
            "type": "Startup Hub"
        },
        "brainstation": {
            "id": "loc_brainstation",
            "name": "BrainStation NYC",
            "address": "113 W 18th St, New York, NY 10011",
            "type": "Education"
        },
        "nyu": {
            "id": "loc_nyu",
            "name": "NYU",
            "address": "New York University, New York, NY",
            "type": "University"
        },
        "columbia": {
            "id": "loc_columbia",
            "name": "Columbia University",
            "address": "116th St & Broadway, New York, NY 10027",
            "type": "University"
        }
    }
    
    def __init__(self):
        self.tz = pytz.timezone("America/New_York")
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
    
    def _parse_date_time(self, date_str: str, time_str: str) -> datetime:
        """Parse date and time strings into datetime object"""
        try:
            # Handle format: "Feb 12 (Wed) , 2025 @ 11:30 AM"
            date_str = re.sub(r'\([^)]+\)', '', date_str)  # Remove weekday abbreviation
            date_str = date_str.replace(' ,', '').strip()
            time_str = time_str.replace('@ ', '').strip()
            
            # Handle various date formats
            month_mappings = {
                "Jan": "January", "Feb": "February", "Mar": "March",
                "Apr": "April", "May": "May", "Jun": "June",
                "Jul": "July", "Aug": "August", "Sep": "September",
                "Oct": "October", "Nov": "November", "Dec": "December"
            }
            
            for abbr, full in month_mappings.items():
                date_str = date_str.replace(abbr, full)
            
            # Add year if not present
            if not any(str(year) in date_str for year in range(2024, 2026)):
                date_str += " 2024"
            
            date_time_str = f"{date_str} {time_str}"
            
            # Try different time formats
            for fmt in ["%B %d %Y %I:%M%p", "%B %d %Y %H:%M"]:
                try:
                    dt = datetime.strptime(date_time_str, fmt)
                    return self.tz.localize(dt)
                except ValueError:
                    continue
            
            raise ValueError(f"Could not parse date/time: {date_time_str}")
            
        except Exception as e:
            print(f"Error parsing date/time: {date_str} {time_str} - {str(e)}")
            return self.tz.localize(datetime.now())
    
    def _parse_price(self, price_text: str) -> Dict[str, any]:
        """Parse price information from text"""
        price_info = {
            "amount": 0,
            "type": "Free",
            "details": ""
        }
        
        if not price_text:
            return price_info
            
        price_text = price_text.lower()
        
        # Check for free events
        if 'free' in price_text:
            return price_info
        
        try:
            # Look for price amounts
            price_matches = re.findall(r'\$(\d+(?:\.\d{2})?)', price_text)
            if price_matches:
                price_info["amount"] = float(price_matches[0])
                price_info["type"] = "Fixed"
                
                # Look for additional price details
                if len(price_matches) > 1:
                    price_info["details"] = f"Prices range from ${price_matches[0]} to ${price_matches[-1]}"
                
                # Look for discount codes
                discount_match = re.search(r'code\s+(\w+)', price_text)
                if discount_match:
                    price_info["details"] += f" (Discount code: {discount_match.group(1)})"
            
            return price_info
            
        except Exception as e:
            print(f"Error parsing price: {str(e)}")
            return price_info
    
    def _parse_location(self, location_text: str) -> Dict[str, str]:
        """Parse location information from text"""
        # Handle "To Be Announced" cases
        if "To Be Announced" in location_text:
            return {
                "id": "loc_tba",
                "name": "To Be Announced",
                "address": "New York, NY",
                "venue_type": "TBA"
            }
        
        # Enhanced address regex based on sample event
        address_regex = r"""
            (\d+[\w\s]+?)  # Street number and name
            (?:,\s*)? 
            (New York|NY)  # City
            ,?\s*
            (NY)?\s*  # State
            (\d{5})?  # ZIP code
        """
        address_match = re.search(address_regex, location_text, re.X | re.I)
        
        if address_match:
            street = address_match.group(1).strip()
            city = address_match.group(2) or "New York"
            state = address_match.group(3) or "NY"
            zip_code = address_match.group(4) or ""
            full_address = f"{street}, {city}, {state} {zip_code}".strip()
            
            return {
                "id": f"loc_custom_{uuid.uuid4().hex[:6]}",
                "name": street.split(',')[0].title(),
                "address": full_address,
                "venue_type": "University" if "university" in location_text.lower() else "Other"
            }
        
        # Check known venues
        for key, venue in self.VENUE_MAPPINGS.items():
            if key in location_text:
                return {
                    "id": venue["id"],
                    "name": venue["name"],
                    "address": venue["address"],
                    "venue_type": venue["type"]
                }
        
        # Try to extract address if present
        address_match = re.search(r'(\d+[^,]+,\s*[^,]+,\s*NY\s*\d{5})', location_text)
        if address_match:
            location_info = {
                "id": "loc_tbd",
                "name": "",
                "address": address_match.group(1),
                "venue_type": "Other"
            }
            location_info["name"] = location_text.split(',')[0].strip().title()
            return location_info
        
        return {
            "id": "loc_tbd",
            "name": "",
            "address": "",
            "venue_type": "Other"
        }
    
    def _parse_description(self, soup: BeautifulSoup) -> Tuple[str, List[Dict[str, str]], List[str]]:
        """Extract description, speakers, and tags from event page"""
        description = ""
        speakers = []
        tags = []
        
        # Find main description - updated selector based on HTML structure
        desc_elem = soup.find('font', class_='fdescription')
        if desc_elem:
            description = '\n'.join([p.text.strip() for p in desc_elem.find_all('br')])
        
        # Extract organizers from "With" clause
        with_match = re.search(r'With\s+([^.]+)\.', description)
        if with_match:
            organizers = [org.strip() for org in with_match.group(1).split(',')]
            speakers.extend({"name": org, "title": "Organizer", "company": ""} for org in organizers)
        
        # Enhanced tag extraction from description
        tag_keywords = {
            "Tech": ["technology", "tech", "software", "coding", "programming"],
            "AI": ["artificial intelligence", "ai", "machine learning", "ml", "deep learning"],
            "Business": ["startup", "entrepreneur", "business", "venture", "founder"],
            "Design": ["design", "ux", "ui", "user experience", "creative"],
            "Data": ["data science", "analytics", "big data", "visualization"],
            "Blockchain": ["blockchain", "crypto", "web3", "nft", "defi"],
            "Career": ["career", "job", "hiring", "recruitment", "professional"],
            "Education": ["education", "learning", "workshop", "training", "course"],
            "Networking": ["connect", "conversation", "lunch", "social"],
            "Startups": ["founder", "startup", "ecosystem", "investor"],
            "Finance": ["term sheets", "bank account", "fintech", "banking"]
        }
        
        desc_lower = description.lower()
        for category, keywords in tag_keywords.items():
            if any(keyword in desc_lower for keyword in keywords):
                tags.append(category)
        
        return description, speakers, list(set(tags))
    
    def _extract_capacity(self, soup: BeautifulSoup) -> Optional[int]:
        """Try to extract event capacity information"""
        capacity = None
        
        # Look for capacity indicators
        capacity_text = soup.find(string=re.compile(r'capacity|limit|spots|seats', re.I))
        if capacity_text:
            # Try to extract number
            number_match = re.search(r'(\d+)', capacity_text)
            if number_match:
                capacity = int(number_match.group(1))
        
        return capacity
    
    def _scrape_event_page(self, url: str) -> Optional[GarysEvent]:
        """Scrape individual event page"""
        try:
            response = self.session.get(url)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Extract title from flogo class
            title_elem = soup.find('font', class_='flogo')
            if not title_elem:
                logger.warning(f"No title found at {url}")
                return None
            
            title = title_elem.text.strip()
            if not title:
                logger.warning(f"Empty title at {url}")
                return None

            # Extract description and related info
            description, speakers, tags = self._parse_description(soup)
            
            # Extract date/time with better error handling
            date_div = soup.find('div', class_='event-date')
            time_div = soup.find('div', class_='event-time')
            
            # Handle missing date/time components
            default_date = datetime.now(self.tz)
            start_date = self._parse_date_time(
                date_div.text.strip() if date_div else default_date.strftime("%B %d %Y"),
                time_div.find('span', class_='start-time').text.strip() if time_div else "12:00PM"
            ) if date_div or time_div else default_date
            
            # Improved end time handling
            end_time = time_div.find('span', class_='end-time') if time_div else None
            if end_time:
                end_date = self._parse_date_time(
                    date_div.text.strip() if date_div else start_date.strftime("%B %d %Y"),
                    end_time.text.strip()
                )
            else:
                # Default to 1.5 hour duration if no end time
                end_date = start_date + timedelta(hours=1.5)

            # Enhanced location parsing from search result example
            location_div = soup.find('div', class_='event-location')
            location_text = location_div.text.strip() if location_div else ""
            
            # Look for address patterns seen in the sample event
            if not location_text:
                address_elem = soup.find(string=re.compile(r'\d+ [A-Za-z ]+ St(?:reet)?, New York'))
                if address_elem:
                    location_text = address_elem.strip()

            location = self._parse_location(location_text)
            
            # Extract price from updated HTML structure
            price_div = soup.find('td', string=re.compile(r'FREE|\$'))
            price_text = price_div.text.strip() if price_div else ""
            
            # Extract capacity from description
            capacity = None
            if any(word in description.lower() for word in ['limited seating', 'limited capacity']):
                capacity_match = re.search(r'(\d+)\s+seats', description)
                capacity = int(capacity_match.group(1)) if capacity_match else 50
            
            # Extract registration URL
            register_link = soup.find('a', {'href': re.compile(r'http://gary\.to/')})
            event_url = register_link['href'] if register_link else url
            
            # Check if featured event
            featured = bool(soup.find('div', class_='featured-event'))
            
            # Improved event type detection from tags
            event_type = "Tech"  # Default
            type_priority = ["Education", "University", "Workshop", "Networking"]
            for tag in type_priority:
                if tag in tags:
                    event_type = tag
                    break
            
            return GarysEvent(
                id=f"evt_gary_{str(uuid.uuid4())[:8]}",
                name=title,
                url=event_url,
                description=description,
                start_date=start_date.isoformat(),
                end_date=end_date.isoformat(),
                location=location,
                speakers=speakers,
                price=self._parse_price(price_text),
                event_type=event_type,
                tags=tags,
                capacity=capacity,
                featured=featured
            )
            
        except Exception as e:
            logger.error(f"Error scraping event page {url}: {str(e)}", exc_info=True)
            return None
    
    def _convert_to_event_json(self, gary_event: GarysEvent) -> Dict:
        """Convert GarysEvent to our standard event JSON format"""
        return {
            "id": gary_event.id,
            "name": gary_event.name,
            "type": gary_event.event_type,
            "locationId": gary_event.location["id"],
            "communityId": "com_gary",
            "description": gary_event.description,
            "startDate": gary_event.start_date,
            "endDate": gary_event.end_date,
            "category": [gary_event.event_type] + gary_event.tags[:2],  # Main type plus top 2 tags
            "price": {
                "amount": gary_event.price["amount"],
                "type": gary_event.price["type"],
                "currency": "USD",
                "details": gary_event.price["details"]
            },
            "capacity": gary_event.capacity or 100,  # Default to 100 if not specified
            "registrationRequired": True,
            "tags": gary_event.tags,
            "image": "gary-event.jpg",
            "status": "upcoming",
            "metadata": {
                "source_url": gary_event.url,
                "speakers": gary_event.speakers,
                "venue": {
                    "name": gary_event.location["name"],
                    "address": gary_event.location["address"],
                    "type": gary_event.location["venue_type"]
                },
                "featured": gary_event.featured
            }
        }
    
    def scrape_events(self) -> bool:
        """Main method to scrape Gary's Guide events"""
        try:
            # Get main events page
            response = self.session.get(self.EVENTS_URL)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find all event links
            event_links = soup.find_all('a', href=re.compile(r'/events/\w+/'))
            
            events = []
            for link in event_links:
                event_url = urljoin(self.BASE_URL, link['href'])
                
                # Scrape individual event page
                event = self._scrape_event_page(event_url)
                if event:
                    events.append(self._convert_to_event_json(event))
                    logger.info(f"Scraped event: {event.name}")
                
                # Be nice to the server
                time.sleep(1)
            
            # Save events
            self._save_events(events)
            
            print(f"Successfully scraped {len(events)} events from Gary's Guide")
            return True
            
        except Exception as e:
            print(f"Error scraping Gary's Guide events: {str(e)}")
            return False
    
    def _save_events(self, new_events: List[Dict]) -> None:
        """Save new events to the events file"""
        events_file = "data/gary_events.json"
        
        # Create file with empty array if doesn't exist
        if not os.path.exists(events_file):
            with open(events_file, 'w') as f:
                json.dump({"events": []}, f)
                
        with open(events_file, 'r+') as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError:
                data = {"events": []}  # Handle empty file case
                
            existing_events = {e["name"] for e in data["events"]}
            # Add new events while avoiding duplicates
            unique_new_events = [event for event in new_events if event["name"] not in existing_events]
            
            # Update events list
            data["events"].extend(unique_new_events)
            
            # Save updated events
            f.seek(0)
            json.dump(data, f, indent=2)
            f.truncate()

if __name__ == "__main__":
    scraper = GarysGuideScraper()
    scraper.scrape_events() 