import os
import sys
import json
import logging
import time
import subprocess
import glob
from importlib import import_module
from datetime import datetime, timedelta
import argparse
import traceback
import importlib
from typing import List, Dict, Any

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Import scrapers list
from scraper.tech.scrapers.calendar_configs import SCRAPERS

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('scraper.log'),
        logging.StreamHandler()
    ]
)

# Setup paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TECH_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(TECH_DIR, 'data')

# Ensure data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

def run_scrapers() -> List[str]:
    """Run all scrapers and return list of output files."""
    output_files = []
    successful_scrapers = 0
    
    for scraper_name in SCRAPERS:
        try:
            logging.info(f"Attempting to run scraper: {scraper_name}")
            # Import the scraper module
            scraper_module = importlib.import_module(f'scraper.tech.scrapers.{scraper_name}')
            logging.info(f"Running scraper: {scraper_name}")
            
            # Run the scraper
            output_file = scraper_module.main()
            if output_file:
                output_files.append(output_file)
                successful_scrapers += 1
                logging.info(f"Scraper {scraper_name} completed successfully")
            else:
                logging.error(f"Scraper {scraper_name} failed to produce output")
                
        except Exception as e:
            logging.error(f"Error running scraper {scraper_name}: {e}")
            continue
    
    logging.info(f"Completed running {successful_scrapers} scrapers successfully")
    return output_files

def combine_event_files(input_files: List[str], output_file: str = None) -> str:
    """Combine multiple event files into one."""
    if not input_files:
        logging.warning("No event files to combine")
        return None
        
    if not output_file:
        output_file = os.path.join(DATA_DIR, "combined_events.json")
    
    all_events = []
    
    for file_path in input_files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, dict) and 'events' in data:
                    all_events.extend(data['events'])
                elif isinstance(data, list):
                    all_events.extend(data)
        except Exception as e:
            logging.error(f"Error reading file {file_path}: {e}")
            continue
    
    if not all_events:
        logging.warning("No events collected. Exiting.")
        return None
    
    # Create data directory if it doesn't exist
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    # Save combined events
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump({"events": all_events}, f, indent=2, ensure_ascii=False)
        logging.info(f"Saved {len(all_events)} combined events to {output_file}")
        return output_file
    except Exception as e:
        logging.error(f"Error saving combined events: {e}")
        return None

def run_categorization(input_file: str, output_file: str) -> None:
    """Run event categorization"""
    try:
        # Load auxiliary data from public/data directory
        root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        communities_file = os.path.join(root_dir, 'public', 'data', 'communities.json')
        locations_file = os.path.join(root_dir, 'public', 'data', 'locations.json')
        
        # Load communities data
        try:
            with open(communities_file, 'r', encoding='utf-8') as f:
                communities_data = json.load(f)
                logging.info(f"Loaded {len(communities_data.get('communities', []))} communities")
        except Exception as e:
            logging.warning(f"Could not load communities data: {e}")
            communities_data = {"communities": []}
            
        # Load locations data
        try:
            with open(locations_file, 'r', encoding='utf-8') as f:
                locations_data = json.load(f)
                logging.info(f"Loaded {len(locations_data.get('locations', []))} locations")
        except Exception as e:
            logging.warning(f"Could not load locations data: {e}")
            locations_data = {"locations": []}
        
        from scraper.tech.categorize_events import main as categorize_main
        categorize_main(input_file, output_file)
        return True
    except Exception as e:
        logging.error(f"Error running categorization: {e}")
        return False

def main():
    """Main function to run all scrapers and combine results."""
    # Parse command line arguments
    append_to_existing = '--append' in sys.argv
    output_file = None
    for i, arg in enumerate(sys.argv):
        if arg == '--output' and i + 1 < len(sys.argv):
            output_file = sys.argv[i + 1]
    
    # Run scrapers
    event_files = run_scrapers()
    
    if not event_files:
        logging.error("No event files were generated. Exiting.")
        return
    
    # Combine events
    combined_file = combine_event_files(event_files)
    if not combined_file:
        logging.error("Failed to combine event files. Exiting.")
        return
    
    # Run categorization
    if not run_categorization(combined_file, output_file):
        logging.error("Failed to categorize events. Exiting.")
        return
    
    # If output file specified, copy combined events there
    if output_file:
        try:
            with open(combined_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            logging.info(f"Saved events to {output_file}")
        except Exception as e:
            logging.error(f"Error saving to output file: {e}")

if __name__ == "__main__":
    main() 