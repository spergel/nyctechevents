import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Union
import hashlib
import requests
from abc import ABC, abstractmethod

from .models import Event, EventMetadata, EventStatus, EventCategory, Price, Organizer, Venue

class BaseScraper(ABC):
    def __init__(self, source_name: str):
        self.source_name = source_name
        self.setup_logging()
        self.setup_paths()
        self.load_auxiliary_data()
        self.session = self.setup_session()
    
    def setup_logging(self):
        """Setup logging configuration"""
        log_dir = Path("scripts/scrapers/logs")
        log_dir.mkdir(parents=True, exist_ok=True)
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_dir / f"{self.source_name}_scraper.log"),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(self.source_name)
    
    def setup_paths(self):
        """Setup standard paths"""
        self.data_dir = Path("scripts/scrapers/data")
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.output_file = self.data_dir / f"{self.source_name}_events.json"
    
    def setup_session(self) -> requests.Session:
        """Setup requests session with standard headers"""
        session = requests.Session()
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        return session
    
    def load_auxiliary_data(self):
        """Load communities and locations data"""
        try:
            with open('data/communities.json', 'r', encoding='utf-8') as f:
                self.communities = {
                    com['id']: com 
                    for com in json.load(f).get('communities', [])
                }
            
            with open('data/locations.json', 'r', encoding='utf-8') as f:
                self.locations = {
                    loc['id']: loc 
                    for loc in json.load(f).get('locations', [])
                }
        except Exception as e:
            self.logger.error(f"Error loading auxiliary data: {e}")
            self.communities = {}
            self.locations = {}
    
    def generate_event_id(self, *args: str) -> str:
        """Generate a unique event ID from multiple strings"""
        combined = "_".join(args)
        return f"evt_{self.source_name}_{hashlib.md5(combined.encode()).hexdigest()[:8]}"
    
    def get_location_id(self, venue_name: str, venue_address: str) -> Optional[str]:
        """Helper to find location ID from venue details"""
        if not venue_name and not venue_address:
            return None
            
        # Clean strings for comparison
        venue_name_clean = venue_name.lower().strip()
        venue_address_clean = venue_address.lower().strip()
        
        # Try to match against locations
        for loc_id, location in self.locations.items():
            loc_name = location.get('name', '').lower()
            loc_address = location.get('address', '').lower()
            
            if (venue_name_clean and loc_name and venue_name_clean in loc_name) or \
               (venue_address_clean and loc_address and venue_address_clean in loc_address):
                return loc_id
        
        return None
    
    def get_community_id(self, community_name: str) -> Optional[str]:
        """Helper to find community ID from name"""
        community_name_clean = community_name.lower().strip()
        
        for com_id, community in self.communities.items():
            if community.get('name', '').lower() == community_name_clean:
                return com_id
        
        return None
    
    @abstractmethod
    def scrape_events(self) -> List[Event]:
        """
        Scrape events from the source.
        Must be implemented by specific scrapers.
        Returns a list of Event objects.
        """
        pass
    
    def save_events(self, events: List[Event]):
        """Save events to JSON file"""
        try:
            output = {
                "last_updated": datetime.now(timezone.utc).isoformat(),
                "total_events": len(events),
                "events": [self.event_to_dict(event) for event in events]
            }
            
            with open(self.output_file, 'w', encoding='utf-8') as f:
                json.dump(output, f, indent=2, ensure_ascii=False)
            
            self.logger.info(f"Successfully saved {len(events)} events to {self.output_file}")
        except Exception as e:
            self.logger.error(f"Error saving events: {e}")
    
    def event_to_dict(self, event: Event) -> Dict:
        """Convert Event object to dictionary for JSON serialization"""
        return {
            "id": event.id,
            "name": event.name,
            "type": event.type,
            "locationId": event.location_id,
            "communityId": event.community_id,
            "description": event.description,
            "startDate": event.start_date.isoformat(),
            "endDate": event.end_date.isoformat(),
            "category": event.category.value,
            "price": {
                "amount": event.price.amount,
                "type": event.price.type,
                "currency": event.price.currency,
                "details": event.price.details
            },
            "registrationRequired": event.registration_required,
            "tags": event.tags,
            "imageUrl": event.image_url,
            "status": event.status.value,
            "metadata": {
                "sourceUrl": event.metadata.source_url,
                "sourceName": event.metadata.source_name,
                "organizer": {
                    "name": event.metadata.organizer.name,
                    "email": event.metadata.organizer.email,
                    "phone": event.metadata.organizer.phone,
                    "website": event.metadata.organizer.website,
                    "instagram": event.metadata.organizer.instagram,
                    "twitter": event.metadata.organizer.twitter
                },
                "venue": {
                    "name": event.metadata.venue.name,
                    "address": event.metadata.venue.address,
                    "type": event.metadata.venue.type,
                    "latitude": event.metadata.venue.latitude,
                    "longitude": event.metadata.venue.longitude,
                    "accessibilityInfo": event.metadata.venue.accessibility_info
                },
                "featured": event.metadata.featured,
                "lastUpdated": event.metadata.last_updated.isoformat(),
                "rawData": event.metadata.raw_data
            },
            "capacity": event.capacity,
            "currentAttendance": event.current_attendance,
            "ageRestriction": event.age_restriction,
            "accessibilityFeatures": event.accessibility_features
        }
    
    def run(self) -> List[Event]:
        """Main execution method"""
        try:
            self.logger.info(f"Starting {self.source_name} scraper...")
            events = self.scrape_events()
            self.save_events(events)
            self.logger.info(f"Completed {self.source_name} scraper")
            return events
        except Exception as e:
            self.logger.error(f"Error in scraper execution: {e}")
            return [] 