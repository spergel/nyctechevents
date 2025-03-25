import os
import sys
import json
import logging
import subprocess
from typing import List, Dict
from datetime import datetime
import importlib

# Add the scrapers directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from scrapers.calendar_configs import SCRAPERS
from categorize_events import EventCategorizer, CATEGORIES

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.FileHandler('scraper.log'), logging.StreamHandler()]
)

def load_events_from_file(file_path: str) -> List[Dict]:
    """Load events from a JSON file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get('events', []) if isinstance(data, dict) else data
    except (FileNotFoundError, json.JSONDecodeError) as e:
        logging.warning(f"Could not load events from {file_path}: {e}")
        return []

def save_events_to_file(events: List[Dict], file_path: str):
    """Save events to a JSON file"""
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump({'events': events}, f, ensure_ascii=False, indent=2)

def clean_event_fields(event: Dict) -> Dict:
    """Clean and standardize event fields"""
    cleaned_event = event.copy()
    
    # Ensure all required fields exist
    for field in ['title', 'start_date', 'end_date', 'location', 'url', 'description', 'source']:
        if field not in cleaned_event:
            cleaned_event[field] = ""
    
    if 'metadata' not in cleaned_event:
        cleaned_event['metadata'] = {}
    
    return cleaned_event

def run_scraper(scraper_name: str) -> List[Dict]:
    """Run a specific scraper and return its events"""
    try:
        # Import the scraper module from the scrapers package
        module_name = f"scrapers.{scraper_name}"
        scraper_module = importlib.import_module(module_name)
        
        # Run the scraper's main function
        if hasattr(scraper_module, 'main'):
            logging.info(f"Running {scraper_name}...")
            scraper_module.main()
            
            # Load the events from the scraper's output file
            output_file = f"data/{scraper_name.replace('_scraper', '')}_events.json"
            events = load_events_from_file(output_file)
            
            # Save the events to the scrapers/data directory
            scraper_data_dir = "scrapers/data"
            os.makedirs(scraper_data_dir, exist_ok=True)
            scraper_output_file = f"{scraper_data_dir}/{scraper_name.replace('_scraper', '')}_events.json"
            save_events_to_file(events, scraper_output_file)
            
            return events
    except Exception as e:
        logging.error(f"Error running {scraper_name}: {e}")
    return []

def run_categorize_events():
    """Run the categorize_events.py script to process the events"""
    try:
        logging.info("Running categorize_events.py to process events...")
        # Import and run the categorize_events module
        from categorize_events import main as categorize_main
        categorize_main()
        logging.info("Events categorized successfully")
    except Exception as e:
        logging.error(f"Error running categorize_events.py: {e}")

def main():
    all_events = []
    
    # Create necessary directories
    os.makedirs("scrapers/data", exist_ok=True)
    
    # Run each scraper except substack
    for scraper in SCRAPERS:
        if 'substack' not in scraper.lower():
            events = run_scraper(scraper)
            logging.info(f"Collected {len(events)} events from {scraper}")
            
            # Add debug logging to see what events are being collected
            if len(events) > 0:
                logging.debug(f"Sample event from {scraper}: {events[0]['name'] if 'name' in events[0] else 'Unknown'}")
            
            all_events.extend(events)
    
    logging.info(f"Total events collected: {len(all_events)}")
    
    # Run categorize_events.py to process the events
    run_categorize_events()

if __name__ == '__main__':
    main() 