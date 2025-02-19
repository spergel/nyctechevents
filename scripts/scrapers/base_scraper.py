import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

class BaseScraper:
    def __init__(self, source_name: str):
        self.source_name = source_name
        self.setup_logging()
        self.setup_paths()
        self.load_auxiliary_data()
    
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
    
    def format_event(self, raw_event: Dict) -> Dict:
        """
        Format a raw event into the standard event format.
        Override this method in specific scrapers.
        """
        raise NotImplementedError
    
    def scrape_events(self) -> List[Dict]:
        """
        Scrape events from the source.
        Override this method in specific scrapers.
        """
        raise NotImplementedError
    
    def save_events(self, events: List[Dict]):
        """Save events to JSON file"""
        try:
            output = {
                "last_updated": datetime.now(timezone.utc).isoformat(),
                "total_events": len(events),
                "events": events
            }
            
            with open(self.output_file, 'w', encoding='utf-8') as f:
                json.dump(output, f, indent=2, ensure_ascii=False)
            
            self.logger.info(f"Successfully saved {len(events)} events to {self.output_file}")
        except Exception as e:
            self.logger.error(f"Error saving events: {e}")
    
    def run(self):
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