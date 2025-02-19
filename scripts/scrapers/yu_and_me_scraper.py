import json
import hashlib
import re
from datetime import datetime
import pytz
from bs4 import BeautifulSoup
import requests
import logging
from typing import Dict, List

from base_scraper import BaseScraper

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class YuAndMeScraper(BaseScraper):
    def __init__(self):
        super().__init__("yu_and_me")
        self.base_url = "https://www.yuandmebooks.com"
        self.events_url = f"{self.base_url}/events"
        self.community_id = "com_yu_and_me"
        self.location_id = "loc_yu_and_me"
    
    def generate_event_id(self, title: str, date_str: str) -> str:
        """Generate a unique event ID"""
        combined = f"{title}_{date_str}"
        return f"evt_{self.source_name}_{hashlib.md5(combined.encode()).hexdigest()[:8]}"
    
    def parse_datetime(self, date_str: str) -> str:
        """Parse Yu and Me's datetime format to ISO format"""
        try:
            et = pytz.timezone('America/New_York')
            # Handle formats: "February 11, 2025 at 7:00PM" or "February 12 at 7:00PM"
            clean_str = re.sub(r"\s+", " ", date_str).replace("at", "").strip()
            if "2025" not in clean_str:  # Add year if missing
                clean_str = clean_str.replace(",", ", 2025,")
            dt = datetime.strptime(clean_str, "%B %d, %Y %I:%M%p")
            return et.localize(dt).astimezone(pytz.utc).isoformat()
        except Exception as e:
            self.logger.error(f"Error parsing datetime: {e}")
            return None
    
    def scrape_event_page(self, url: str) -> Dict:
        """Scrape individual event page"""
        try:
            response = requests.get(url)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Extract price information
            price_element = soup.select_one(".price-item--last")
            price_cents = 0
            if price_element and "$" in price_element.text:
                price_str = price_element.text.split("$")[1].split(" ")[0]
                price_cents = int(float(price_str) * 100)
            
            return {
                "price_cents": price_cents,
                "description": soup.select_one(".product__description").get_text(separator="\n", strip=True)
            }
        except Exception as e:
            self.logger.error(f"Error scraping event page: {e}")
            return {"price_cents": 0, "description": ""}
    
    def format_event(self, raw_event: Dict) -> Dict:
        """Format raw event data into standard format"""
        event = {
            "id": raw_event["id"],
            "name": raw_event["name"],
            "type": "Book Event",
            "locationId": self.location_id,
            "communityId": self.community_id,
            "description": raw_event.get("description", ""),
            "startDate": raw_event["startDate"],
            "endDate": raw_event["startDate"],  # Yu and Me events are single-date
            "category": "Literature",
            "price": {
                "amount": raw_event.get("price_cents", 0) / 100,
                "type": "Free" if raw_event.get("price_cents", 0) == 0 else "Fixed",
                "currency": "USD",
                "details": ""
            },
            "registrationRequired": True,
            "tags": ["books", "literature", "author event"],
            "image": "",
            "status": "upcoming",
            "metadata": {
                "source_url": raw_event.get("source_url", ""),
                "organizer": {
                    "name": "Yu and Me Books",
                    "instagram": "@yuandmebooks",
                    "email": "info@yuandmebooks.com"
                },
                "venue": {
                    "name": "Yu and Me Books",
                    "address": "44 Mulberry St, New York, NY 10013",
                    "type": "Bookstore"
                },
                "featured": False
            }
        }
        return event
    
    def scrape_events(self) -> List[Dict]:
        """Scrape Yu and Me Books events"""
        events = []
        
        try:
            response = requests.get(self.events_url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }, timeout=10)
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
                    
                    # Create raw event data
                    raw_event = {
                        "id": self.generate_event_id(title, date_str),
                        "name": title,
                        "startDate": self.parse_datetime(date_str),
                        "source_url": event_url,
                        **page_details
                    }
                    
                    # Format event and add to list if valid
                    if raw_event["startDate"]:
                        formatted_event = self.format_event(raw_event)
                        events.append(formatted_event)
                        self.logger.info(f"Added event: {formatted_event['name']}")
                    else:
                        self.logger.warning(f"Skipping event due to invalid date: {title}")
                
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