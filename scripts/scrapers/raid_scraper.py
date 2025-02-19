import os
import json
import requests
import hashlib
from datetime import datetime
from typing import Dict, List

from base_scraper import BaseScraper

# Load locations data
def load_locations() -> Dict:
    try:
        with open('data/locations.json', 'r', encoding='utf-8') as f:
            return {loc['id']: loc for loc in json.load(f).get('locations', [])}
    except Exception as e:
        print(f"Error loading locations: {e}")
        return {}

# Load communities data
def load_communities() -> Dict:
    try:
        with open('data/communities.json', 'r', encoding='utf-8') as f:
            return {com['id']: com for com in json.load(f).get('communities', [])}
    except Exception as e:
        print(f"Error loading communities: {e}")
        return {}

LOCATIONS = load_locations()
COMMUNITIES = load_communities()
COMMUNITY_ID = "com_raid"

def get_location_id(event_location: str) -> str:
    """
    Determine the location ID based on event location.
    Returns empty string if no match found.
    """
    if not event_location:
        return ""
    
    # Clean the event location for matching
    event_location_clean = event_location.lower().strip()
    
    # Try to match against all locations
    for loc_id, location in LOCATIONS.items():
        # Check if location name or address matches
        if (location.get('name', '').lower() in event_location_clean or 
            location.get('address', '').lower() in event_location_clean):
            return loc_id
    
    return ""

class RaidScraper(BaseScraper):
    def __init__(self):
        super().__init__("raid")
        self.api_url = "https://api.lu.ma/v1/public/calendar/raid"
        self.community_id = "com_raid"
        self.headers = {
            "accept": "application/json, text/plain, */*",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36"
        }
    
    def generate_event_id(self, title: str) -> str:
        """Generate a unique event ID"""
        return f"evt_{self.source_name}_{hashlib.md5(title.encode()).hexdigest()[:8]}"
    
    def format_event(self, raw_event: Dict) -> Dict:
        """Format raw event data into standard format"""
        # Get location ID if available
        venue_name = raw_event.get("location", {}).get("name", "")
        venue_address = raw_event.get("location", {}).get("address", "")
        location_id = self.get_location_id(venue_name) or "loc_tbd"
        
        return {
            "id": self.generate_event_id(raw_event["name"]),
            "name": raw_event["name"],
            "type": "Tech Talk",
            "locationId": location_id,
            "communityId": self.community_id,
            "description": raw_event.get("description", ""),
            "startDate": raw_event["startDate"],
            "endDate": raw_event["endDate"],
            "category": "Tech",
            "price": {
                "amount": raw_event.get("price", 0),
                "type": "Free" if raw_event.get("price", 0) == 0 else "Fixed",
                "currency": "USD",
                "details": f"${raw_event.get('price', 0)}" if raw_event.get("price", 0) > 0 else ""
            },
            "registrationRequired": True,
            "tags": ["tech", "research", "ai", "design"],
            "image": raw_event.get("coverImage", ""),
            "status": "upcoming",
            "metadata": {
                "source_url": raw_event.get("url", ""),
                "organizer": {
                    "name": "RAID NYC",
                    "instagram": "",
                    "email": ""
                },
                "venue": {
                    "name": venue_name,
                    "address": venue_address,
                    "type": "Offline"
                },
                "featured": False
            }
        }
    
    def scrape_events(self) -> List[Dict]:
        """Scrape RAID NYC events"""
        try:
            response = requests.get(self.api_url, headers=self.headers)
            response.raise_for_status()
            
            events_data = response.json().get('events', [])
            return [self.format_event(event) for event in events_data]
            
        except Exception as e:
            self.logger.error(f"Error scraping events: {str(e)}")
            return []

def main():
    scraper = RaidScraper()
    scraper.run()

if __name__ == "__main__":
    main() 