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
    url: str  # The direct Gary's Guide event URL
    description: str
    start_date: str
    end_date: str
    location: Dict[str, str]  # {"name": "", "address": ""}
    speakers: List[Dict[str, str]]
    price: Dict[str, any]  # {"amount": float, "type": str}
    event_type: str
    tags: List[str]
    capacity: Optional[int]
    registration_url: Optional[str] = None  # Registration URL if available

class GarysGuideScraper:
    BASE_URL = "https://www.garysguide.com"
    EVENTS_URL = f"{BASE_URL}/events?region=nyc"
    
    def __init__(self):
        self.tz = pytz.timezone("America/New_York")
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
    
    def _extract_speakers_from_html(self, soup: BeautifulSoup) -> List[Dict[str, str]]:
        """Extract speaker information from HTML"""
        speakers = []
        
        # Look for speaker information in the event description
        for element in soup.find_all('td'):
            if 'With' in element.text:
                speaker_text = element.text.strip()
                speaker_match = re.search(r'With\s+(.+?)\.', speaker_text)
                if speaker_match:
                    speaker_list = speaker_match.group(1).split(',')
                    for speaker in speaker_list:
                        speaker = speaker.strip()
                        # Check for pattern: Name (Title, Company)
                        name_title_match = re.match(r'(.+?)\s*\((.+?)\)', speaker)
                        if name_title_match:
                            name = name_title_match.group(1).strip()
                            title_company = name_title_match.group(2).strip()
                            speakers.append({
                                "name": name,
                                "title": title_company,
                                "company": ""
                            })
                        else:
                            # Just a name
                            speakers.append({
                                "name": speaker,
                                "title": "",
                                "company": ""
                            })
                    break
        
        return speakers
    
    def _extract_categories(self, title: str, description: str) -> List[str]:
        """Extract categories from title and description"""
        tags = ["Tech"]  # Default tag
        
        # Simple keyword matching for categories
        if any(word in title.lower() or word in description.lower() for word in ["ai", "artificial intelligence", "machine learning"]):
            tags.append("AI")
        
        if any(word in title.lower() or word in description.lower() for word in ["business", "entrepreneur", "startup"]):
            tags.append("Business")
        
        if any(word in title.lower() or word in description.lower() for word in ["workshop", "training", "class"]):
            tags.append("Workshop")
        
        if any(word in title.lower() or word in description.lower() for word in ["conference", "summit", "expo"]):
            tags.append("Conference")
        
        return list(set(tags))
    
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

            # Extract description
            description = ""
            desc_elem = soup.find('font', class_='fdescription')
            if desc_elem:
                description = desc_elem.text.strip()
            
            # Extract speakers
            speakers = self._extract_speakers_from_html(soup)
            
            # Extract tags and determine event type
            tags = self._extract_categories(title, description)
            event_type = "Event"  # Default type
            
            if "conference" in title.lower() or "summit" in title.lower():
                event_type = "Conference"
            elif "workshop" in title.lower() or "class" in title.lower():
                event_type = "Workshop"
            elif "meetup" in title.lower() or "networking" in title.lower():
                event_type = "Meetup"
            
            # Extract date/time information
            start_date = datetime.now(self.tz) + timedelta(days=30)  # Default to 30 days from now
            end_date = start_date + timedelta(hours=1.5)
            
            # Extract date/time if available
            for element in soup.find_all('td'):
                if element.find('i', class_='far fa-calendar-alt fa-lg'):
                    date_time_info = element.text.strip()
                    try:
                        # Extract date and time using regex
                        date_match = re.search(r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d+).*?(\d{4})', date_time_info)
                        time_match = re.search(r'@\s*(\d+:\d+\s*[APM]{2})', date_time_info)
                        
                        if date_match and time_match:
                            month, day, year = date_match.group(1), date_match.group(2), date_match.group(3)
                            time_str = time_match.group(1)
                            
                            date_str = f"{month} {day}, {year}"
                            try:
                                date_obj = datetime.strptime(f"{date_str} {time_str}", "%b %d, %Y %I:%M %p")
                                start_date = self.tz.localize(date_obj)
                                end_date = start_date + timedelta(hours=1.5)
                            except ValueError:
                                pass
                    except Exception:
                        pass
                    break
            
            # Extract location information
            location_info = {
                "id": "loc_tbd",
                "name": "",
                "address": ""
            }
            
            for element in soup.find_all('td'):
                if element.find('i', class_='fa fa-map-marker-alt fa-lg'):
                    location_text = element.text.strip()
                    
                    # Parse venue name and address
                    if location_text:
                        # Try to extract venue name and address
                        venue_parts = location_text.split(',', 1)
                        if len(venue_parts) > 0:
                            location_info["name"] = venue_parts[0].strip()
                            if len(venue_parts) > 1:
                                location_info["address"] = venue_parts[1].strip()
                            else:
                                location_info["address"] = location_text
                    break
            
            # Extract price information
            price_info = {
                "amount": 0,
                "type": "Free"
            }
            
            for element in soup.find_all('td'):
                if element.find('i', class_='fa-solid fa-ticket fa-lg'):
                    price_text = element.text.strip()
                    
                    # Parse price
                    if price_text:
                        # Check if it's free
                        if 'free' in price_text.lower():
                            price_info["type"] = "Free"
                            price_info["amount"] = 0
                        else:
                            # Try to extract price amount
                            price_match = re.search(r'\$(\d+(?:\.\d+)?)', price_text)
                            if price_match:
                                try:
                                    price_amount = float(price_match.group(1))
                                    price_info["amount"] = price_amount
                                    price_info["type"] = "Paid"
                                except ValueError:
                                    pass
                    break
            
            # Extract registration link
            registration_url = None
            register_button = soup.find('a', class_='fbutton', text=re.compile(r'Register', re.I))
            if register_button and 'href' in register_button.attrs:
                registration_url = register_button['href']
                # If it's a relative link, make it absolute
                if not registration_url.startswith('http'):
                    registration_url = urljoin(self.BASE_URL, registration_url)
            
            # Estimate capacity based on event type
            capacity = 100  # Default capacity
            
            # Create the event object
            return GarysEvent(
                id=f"evt_gary_{str(uuid.uuid4())[:8]}",
                name=title,
                url=url,  # The direct Gary's Guide event URL
                description=description,
                start_date=start_date.isoformat(),
                end_date=end_date.isoformat(),
                location=location_info,
                speakers=speakers,
                price=price_info,
                event_type=event_type,
                tags=tags,
                capacity=capacity,
                registration_url=registration_url
            )
            
        except Exception as e:
            logger.error(f"Error scraping event page {url}: {str(e)}")
            return None
            
    def _convert_to_event_json(self, gary_event: GarysEvent) -> Dict:
        """Convert GarysEvent to our standard event JSON format"""
        return {
            "id": gary_event.id,
            "name": gary_event.name,
            "type": gary_event.event_type,
            "locationId": "loc_tbd",
            "communityId": "com_gary",
            "description": gary_event.description,
            "startDate": gary_event.start_date,
            "endDate": gary_event.end_date,
            "category": [gary_event.event_type] + gary_event.tags[:2],  # Main type plus top 2 tags
            "price": {
                "amount": gary_event.price["amount"],
                "type": gary_event.price["type"],
                "currency": "USD",
                "details": ""
            },
            "capacity": gary_event.capacity or 100,
            "registrationRequired": True,
            "tags": gary_event.tags,
            "image": "gary-event.jpg",
            "status": "upcoming",
            "metadata": {
                "source_url": gary_event.url,  # The direct Gary's Guide event URL
                "registration_url": gary_event.registration_url,  # Add registration URL to metadata
                "speakers": gary_event.speakers,
                "venue": {
                    "name": gary_event.location["name"],
                    "address": gary_event.location["address"],
                    "type": "Other"
                }
            }
        }
    
    def scrape_events(self) -> bool:
        """Main method to scrape all Gary's Guide events"""
        try:
            # Get main events page
            response = self.session.get(self.EVENTS_URL)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find all event links - be more specific to target actual event pages
            event_links = soup.find_all('a', href=re.compile(r'/events/\w+/'))
            event_urls = []
            
            # Collect all unique event URLs
            for link in event_links:
                # Skip affiliate links (gary.to) - we want the actual Gary's Guide event pages
                if 'gary.to' in link.get('href', ''):
                    continue
                    
                event_url = urljoin(self.BASE_URL, link['href'])
                if event_url not in event_urls:
                    event_urls.append(event_url)
            
            logger.info(f"Found {len(event_urls)} events to scrape")
            
            events = []
            for url in event_urls:
                # Scrape individual event page
                event = self._scrape_event_page(url)
                if event:
                    events.append(self._convert_to_event_json(event))
                    logger.info(f"Scraped event: {event.name}")
                
                # Be nice to the server
                time.sleep(1)
            
            # Save events
            self._save_events(events)
            
            logger.info(f"Successfully scraped {len(events)} events from Gary's Guide")
            return True
            
        except Exception as e:
            logger.error(f"Error scraping Gary's Guide events: {str(e)}")
            return False
    
    def _save_events(self, new_events: List[Dict]) -> None:
        """Save new events to the events file"""
        events_file = "data/gary_events.json"
        
        # Create file with empty array if doesn't exist
        if not os.path.exists(events_file):
            os.makedirs(os.path.dirname(events_file), exist_ok=True)
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
            
            logger.info(f"Saved {len(unique_new_events)} new events to {events_file}")

def main():
    """Entry point for the scraper"""
    logger.info("Starting Gary's Guide events scraper")
    scraper = GarysGuideScraper()
    success = scraper.scrape_events()
    if success:
        logger.info("Gary's Guide events scraping completed successfully")
    else:
        logger.error("Gary's Guide events scraping failed")
    return success

if __name__ == "__main__":
    main() 