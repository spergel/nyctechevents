import hashlib
import re
from datetime import datetime
import pytz
from bs4 import BeautifulSoup
import requests
import time
import random
from typing import Dict, List, Optional

from ..scrapers.base_scraper import BaseScraper
from ..models import Event, EventMetadata, EventStatus, EventCategory, Price, Organizer, Venue

class WondervilleScraper(BaseScraper):
    def __init__(self):
        super().__init__("wonderville")
        self.base_url = "https://www.wonderville.nyc"
        self.events_url = f"{self.base_url}/events"
        self.community_id = "com_wonderville"
        self.location_id = "loc_wonderville"
        self.user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        
        # Standard metadata for Wonderville
        self.default_organizer = Organizer(
            name="Wonderville",
            email="hello@wonderville.nyc",
            website=self.base_url
        )
        
        self.default_venue = Venue(
            name="Wonderville",
            address="1186 Broadway, Brooklyn, NY 11221",
            type="Arcade Venue"
        )
    
    def generate_event_id(self, title: str, date: str) -> str:
        """Generate a unique event ID"""
        return f"evt_{self.source_name}_{hashlib.md5(f'{title}_{date}'.encode()).hexdigest()[:8]}"
    
    def parse_datetime(self, date_str: str, time_str: str) -> Optional[datetime]:
        """Parse Wonderville's datetime format to datetime object"""
        try:
            et = pytz.timezone('America/New_York')
            # Handle both 12-hour and 24-hour formats
            time_formats = ["%I:%M %p", "%I %p", "%H:%M", "%H"]
            
            for fmt in time_formats:
                try:
                    dt = datetime.strptime(f"{date_str} {time_str}", f"%Y-%m-%d {fmt}")
                    return et.localize(dt).astimezone(pytz.utc)
                except ValueError:
                    continue
            return None
        except Exception as e:
            self.logger.error(f"Error parsing datetime: {e}")
            return None
    
    def scrape_event_page(self, url: str) -> Optional[Dict]:
        """Scrape individual event page"""
        try:
            session = requests.Session()
            session.headers.update({"User-Agent": self.user_agent})
            
            response = session.get(url)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Safely extract elements with null checks
            title_element = soup.select_one(".eventitem-title")
            date_element = soup.select_one(".event-date")
            
            if not title_element or not date_element:
                self.logger.warning(f"Skipping event with missing required fields at {url}")
                return None
            
            # Safely extract time elements
            time_container = soup.select_one(".event-time-12hr, .event-time-24hr")
            start_time_element = soup.select_one(".event-time-12hr-start, .event-time-24hr-start")
            end_time_element = soup.select_one(".event-time-12hr-end, .event-time-24hr-end")
            
            # Get times from container if direct elements not found
            start_time = None
            end_time = None
            if time_container:
                times = [t.strip() for t in time_container.get_text().split('–')]
                start_time = times[0] if len(times) > 0 else None
                end_time = times[1] if len(times) > 1 else None
            
            # Get description
            description = soup.select_one(".eventitem-column-content")
            description_text = description.get_text(separator="\n", strip=True) if description else ""
            
            # Get address
            address_elem = soup.select_one(".eventitem-meta-address")
            address = address_elem.get_text(separator=" ", strip=True).replace("(map)", "").strip() if address_elem else ""
            
            return {
                "title": title_element.get_text(strip=True),
                "date": date_element.get("datetime"),
                "start_time": start_time_element.get_text(strip=True) if start_time_element else start_time,
                "end_time": end_time_element.get_text(strip=True) if end_time_element else end_time,
                "description": description_text,
                "address": address
            }
        except Exception as e:
            self.logger.error(f"Error scraping {url}: {str(e)}")
            return None
    
    def scrape_events(self) -> List[Event]:
        """Scrape Wonderville events"""
        events = []
        
        try:
            session = requests.Session()
            session.headers.update({"User-Agent": self.user_agent})
            
            response = session.get(self.events_url)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            
            event_links = soup.select(".eventlist-title-link")
            
            # Add random delay between requests
            for i, event_link in enumerate(event_links):
                try:
                    if i > 0:
                        time.sleep(random.uniform(1.5, 3.5))  # Random delay between 1.5-3.5 seconds
                    
                    event_url = f"{self.base_url}{event_link['href']}"
                    event_data = self.scrape_event_page(event_url)
                    
                    if not event_data:
                        continue
                    
                    # Parse start and end times
                    start_date = self.parse_datetime(event_data["date"], event_data["start_time"])
                    end_date = self.parse_datetime(event_data["date"], event_data["end_time"]) if event_data["end_time"] else start_date
                    
                    if not start_date:
                        self.logger.warning(f"Skipping event due to invalid date: {event_data['title']}")
                        continue
                    
                    # Create metadata
                    metadata = EventMetadata(
                        source_url=event_url,
                        source_name=self.source_name,
                        organizer=self.default_organizer,
                        venue=self.default_venue
                    )
                    
                    # Create event object
                    event = Event(
                        id=self.generate_event_id(event_data["title"], event_data["date"]),
                        name=event_data["title"],
                        type="Gaming Event",
                        location_id=self.location_id,
                        community_id=self.community_id,
                        description=event_data["description"],
                        start_date=start_date,
                        end_date=end_date or start_date,
                        category=EventCategory.GAMING,
                        price=Price(amount=0.0, type="Free"),  # Wonderville events are typically free
                        registration_required=False,
                        tags=["arcade", "gaming", "indie games"],
                        metadata=metadata
                    )
                    
                    events.append(event)
                    self.logger.info(f"Added event: {event.name}")
                
                except Exception as e:
                    self.logger.error(f"Error processing event: {str(e)}")
                    continue
            
        except Exception as e:
            self.logger.error(f"Failed to scrape main events page: {str(e)}")
        
        return events

def main():
    scraper = WondervilleScraper()
    scraper.run()

if __name__ == "__main__":
    main() 