import json
import hashlib
import re
from datetime import datetime
import pytz
from bs4 import BeautifulSoup
import requests
import logging
from typing import Dict, List, Optional

from base_scraper import BaseScraper
from models import Event, EventMetadata, EventStatus, EventCategory, Price, Organizer, Venue

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class YuAndMeScraper(BaseScraper):
    def __init__(self):
        super().__init__("yu_and_me")
        self.base_url = "https://www.yuandmebooks.com"
        self.events_url = f"{self.base_url}/events"
        self.community_id = "com_yu_and_me"
        self.location_id = "loc_yu_and_me"
        
        # Standard metadata for Yu and Me Books
        self.default_organizer = Organizer(
            name="Yu and Me Books",
            email="info@yuandmebooks.com",
            instagram="@yuandmebooks",
            website=self.base_url
        )
        
        self.default_venue = Venue(
            name="Yu and Me Books",
            address="44 Mulberry St, New York, NY 10013",
            type="Bookstore"
        )
    
    def generate_event_id(self, title: str, date_str: str) -> str:
        """Generate a unique event ID"""
        combined = f"{title}_{date_str}"
        return f"evt_{self.source_name}_{hashlib.md5(combined.encode()).hexdigest()[:8]}"
    
    def parse_datetime(self, date_str: str) -> Optional[datetime]:
        """Parse Yu and Me's datetime format to datetime object"""
        try:
            et = pytz.timezone('America/New_York')
            # Handle formats: "February 11, 2025 at 7:00PM" or "February 12 at 7:00PM"
            clean_str = re.sub(r"\s+", " ", date_str).replace("at", "").strip()
            if "2025" not in clean_str:  # Add year if missing
                clean_str = clean_str.replace(",", ", 2025,")
            dt = datetime.strptime(clean_str, "%B %d, %Y %I:%M%p")
            return et.localize(dt).astimezone(pytz.utc)
        except Exception as e:
            self.logger.error(f"Error parsing datetime: {e}")
            return None
    
    def scrape_event_page(self, url: str) -> Dict:
        """Scrape individual event page"""
        try:
            response = self.session.get(url)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Extract price information
            price_element = soup.select_one(".price-item--last")
            price_amount = 0.0
            if price_element and "$" in price_element.text:
                price_str = price_element.text.split("$")[1].split(" ")[0]
                price_amount = float(price_str)
            
            description = soup.select_one(".product__description")
            description_text = description.get_text(separator="\n", strip=True) if description else ""
            
            return {
                "price_amount": price_amount,
                "description": description_text
            }
        except Exception as e:
            self.logger.error(f"Error scraping event page: {e}")
            return {"price_amount": 0.0, "description": ""}
    
    def scrape_events(self) -> List[Event]:
        """Scrape Yu and Me Books events"""
        events = []
        
        try:
            response = self.session.get(self.events_url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            event_container = soup.select_one("#MainContent .shopify-section")
            
            if not event_container:
                self.logger.error("Could not find event container")
                return []
            
            for event_div in event_container.select(".image-with-text:has(a.button--primary)"):
                try:
                    # Required fields with fallbacks
                    title_elem = event_div.select_one(".h2")
                    date_elem = event_div.select_one(".caption-with-letter-spacing")
                    link_elem = event_div.select_one("a.button--primary")
                    
                    if not all([title_elem, date_elem, link_elem]):
                        self.logger.warning("Skipping incomplete event card")
                        continue
                    
                    # Get event details
                    title = title_elem.get_text(strip=True)
                    date_str = date_elem.get_text(strip=True)
                    event_url = f"{self.base_url}{link_elem['href']}"
                    
                    # Get additional details from event page
                    page_details = self.scrape_event_page(event_url)
                    
                    # Parse datetime
                    start_date = self.parse_datetime(date_str)
                    if not start_date:
                        self.logger.warning(f"Skipping event due to invalid date: {title}")
                        continue
                    
                    # Create price object
                    price = Price(
                        amount=page_details["price_amount"],
                        type="Free" if page_details["price_amount"] == 0 else "Fixed"
                    )
                    
                    # Create metadata
                    metadata = EventMetadata(
                        source_url=event_url,
                        source_name=self.source_name,
                        organizer=self.default_organizer,
                        venue=self.default_venue
                    )
                    
                    # Create event object
                    event = Event(
                        id=self.generate_event_id(title, date_str),
                        name=title,
                        type="Book Event",
                        location_id=self.location_id,
                        community_id=self.community_id,
                        description=page_details["description"],
                        start_date=start_date,
                        end_date=start_date,  # Yu and Me events are single-date
                        category=EventCategory.LITERATURE,
                        price=price,
                        registration_required=True,
                        tags=["books", "literature", "author event"],
                        metadata=metadata
                    )
                    
                    events.append(event)
                    self.logger.info(f"Added event: {event.name}")
                
                except Exception as e:
                    self.logger.error(f"Error processing event: {str(e)}")
                    continue
            
        except Exception as e:
            self.logger.error(f"Error scraping events: {str(e)}")
        
        return events

def main():
    scraper = YuAndMeScraper()
    scraper.run()

if __name__ == "__main__":
    main() 