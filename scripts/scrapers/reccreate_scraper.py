import hashlib
import requests
from datetime import datetime
from typing import Dict, List

from base_scraper import BaseScraper

class ReccreateCollectiveScraper(BaseScraper):
    def __init__(self):
        super().__init__("reccreate")
        self.api_url = "https://api.lu.ma/calendar/get-items?calendar_api_id=cal-qElIwraRKRTnnG5&period=future&pagination_limit=50"
        self.community_id = "com_reccreate"
        self.headers = {
            "accept": "application/json, text/plain, */*",
            "x-luma-client-type": "luma-web",
            "x-luma-client-version": "4604a0bd005a325875c14c7df45d25d691454604",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 Edg/133.0.0.0"
        }
    
    def generate_event_id(self, title: str) -> str:
        """Generate a unique event ID"""
        return f"evt_{self.source_name}_{hashlib.md5(title.encode()).hexdigest()[:8]}"
    
    def format_event(self, raw_event: Dict) -> Dict:
        """Format raw event data into standard format"""
        event = raw_event["event"]
        calendar = raw_event["calendar"]
        price_info = raw_event.get("ticket_info", {})
        
        return {
            "id": self.generate_event_id(event["name"]),
            "name": event["name"],
            "type": raw_event["tags"][0]["name"] if raw_event.get("tags") else "Workshop",
            "locationId": "loc_nyc",  # TODO: Use location matching
            "communityId": self.community_id,
            "description": calendar.get("description_short", ""),
            "startDate": event["start_at"],
            "endDate": event["end_at"],
            "category": "",
            "price": {
                "amount": price_info.get("price", {}).get("cents", 0) / 100 if price_info.get("price") else 0,
                "currency": "USD",
                "type": "Free" if price_info.get("is_free") else "Fixed",
                "details": ""
            },
            "registrationRequired": True,
            "tags": [tag["name"].lower() for tag in raw_event.get("tags", [])],
            "image": event.get("cover_url", ""),
            "status": "upcoming",
            "metadata": {
                "source_url": event.get("url", ""),
                "organizer": {
                    "name": "Reccreate Collective",
                    "instagram": calendar.get("instagram_handle", "@reccreatecollective"),
                    "email": "hello@reccreatecollective.com"
                },
                "venue": {
                    "name": "Reccreate Studio",
                    "address": event["geo_address_info"]["full_address"],
                    "type": "Art Studio"
                },
                "featured": False
            }
        }
    
    def scrape_events(self) -> List[Dict]:
        """Scrape Reccreate Collective events"""
        try:
            response = requests.get(self.api_url, headers=self.headers)
            response.raise_for_status()
            data = response.json()
            
            return [self.format_event(entry) for entry in data.get("entries", [])]
            
        except Exception as e:
            self.logger.error(f"Error scraping events: {str(e)}")
            return []

def main():
    scraper = ReccreateCollectiveScraper()
    scraper.run()

if __name__ == "__main__":
    main() 