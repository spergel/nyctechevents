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
import shutil

# Import scrapers list
from tech.scrapers.calendar_configs import SCRAPERS

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)

# Setup paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TECH_DIR = os.path.join(PROJECT_ROOT, 'tech')
SCRAPERS_DIR = os.path.join(TECH_DIR, 'scrapers')
DATA_DIR = os.path.join(TECH_DIR, 'data')
PUBLIC_DATA_DIR = os.path.join(PROJECT_ROOT, 'public', 'data')

# Ensure directories exist
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(PUBLIC_DATA_DIR, exist_ok=True)

def run_scraper(scraper_module_name):
    """Run a scraper module and return the path to its output file"""
    logging.info(f"Running scraper: {scraper_module_name}")
    
    try:
        # Import the scraper module
        scraper_path = f"tech.scrapers.{scraper_module_name}"
        scraper_module = import_module(scraper_path)
        
        # Check if the module has a main function
        if hasattr(scraper_module, 'main'):
            # Call the main function
            result = scraper_module.main()
            logging.info(f"Scraper {scraper_module_name} completed successfully")
            
            # Return the output file path if provided by the scraper
            if isinstance(result, str) and os.path.exists(result):
                return result
            
            # Otherwise, look for the default output file
            default_output = os.path.join(DATA_DIR, f"{scraper_module_name}_events.json")
            if os.path.exists(default_output):
                return default_output
                
            logging.warning(f"No output file found for {scraper_module_name}")
            return None
        else:
            logging.error(f"Scraper {scraper_module_name} does not have a main function")
            return None
    except Exception as e:
        logging.error(f"Error running scraper {scraper_module_name}: {str(e)}")
        return None

def run_scrapers():
    """Runs all specified scrapers."""
    scrapers_completed = 0
    event_files = []
    
    for scraper_name in SCRAPERS:
        logging.info(f"Attempting to run scraper: {scraper_name}")
        try:
            # Import the scraper module dynamically
            scraper_module = import_module(f"tech.scrapers.{scraper_name}")
            
            # Run the main function of the scraper
            logging.info(f"Running scraper: {scraper_name}")
            result = scraper_module.main()
            scrapers_completed += 1
            logging.info(f"Scraper {scraper_name} completed successfully")
            
            # Add output file to list
            if isinstance(result, str) and os.path.exists(result):
                event_files.append(result)
            else:
                # Look for default output file
                default_output = os.path.join(DATA_DIR, f"{scraper_name.replace('_scraper', '')}_events.json")
                if os.path.exists(default_output):
                    event_files.append(default_output)
        except Exception as e:
            logging.error(f"Error running scraper {scraper_name}: {str(e)}")
            traceback.print_exc()
    
    logging.info(f"Completed running {scrapers_completed} scrapers successfully")
    return event_files

def combine_event_files(event_files, output_file=None):
    """Combine multiple event JSON files into a single file"""
    if not event_files:
        logging.warning("No event files to combine")
        return None
    
    logging.info(f"Combining {len(event_files)} event files...")
    
    # Default output file
    if output_file is None:
        output_file = os.path.join(DATA_DIR, "all_events.json")
    
    # Load and combine all events
    all_events = []
    for file_path in event_files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
                # Handle different JSON structures
                if isinstance(data, dict) and 'events' in data:
                    events = data['events']
                elif isinstance(data, list):
                    events = data
                else:
                    logging.warning(f"Unexpected data format in {file_path}, skipping")
                    continue
                
                all_events.extend(events)
                logging.info(f"Added {len(events)} events from {os.path.basename(file_path)}")
        except Exception as e:
            logging.error(f"Error processing {file_path}: {str(e)}")
    
    # Save combined events
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump({"events": all_events}, f, indent=2, ensure_ascii=False)
        logging.info(f"Combined {len(all_events)} events into {output_file}")
        return output_file
    except Exception as e:
        logging.error(f"Error saving combined events: {str(e)}")
        return None

def run_categorization(append_to_existing=False):
    """Run the event categorization process"""
    logging.info("Starting event categorization...")
    
    # Import the categorization module
    try:
        from tech.categorize_events import deduplicate_events, process_events, save_categorized_events, load_events
        
        # Input and output files
        input_file = os.path.join(DATA_DIR, "all_events.json")
        output_file = os.path.join(DATA_DIR, "all_events_categorized.json")
        
        # Check if input file exists
        if not os.path.exists(input_file):
            logging.error(f"Input file {input_file} not found")
            return False
        
        # Load events
        events = load_events(input_file)
        logging.info(f"Loaded {len(events)} events for categorization")
        
        # Append to existing events if requested
        if append_to_existing and os.path.exists(output_file):
            try:
                existing_events = load_events(output_file)
                logging.info(f"Loaded {len(existing_events)} existing events from {output_file}")
                
                # Combine with new events
                combined_events = existing_events + events
                logging.info(f"Combined with {len(events)} new events, total: {len(combined_events)} events")
                events = combined_events
            except Exception as e:
                logging.warning(f"Error loading existing events: {str(e)}")
                logging.warning("Proceeding with only new events")
        
        # Deduplicate events
        deduplicated_events = deduplicate_events(events)
        logging.info(f"Deduplication complete. {len(deduplicated_events)} events remaining.")
        
        # Process and categorize events
        categorized_events = process_events(deduplicated_events)
        
        # Save categorized events
        save_categorized_events(categorized_events, output_file)
        logging.info(f"Categorization complete. Saved to {output_file}")
        return True
    except Exception as e:
        logging.error(f"Error during categorization: {str(e)}")
        return False

def main():
    """Main function to run all scrapers and categorize events"""
    start_time = time.time()
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Run all scrapers and categorize events')
    parser.add_argument('--append', action='store_true', help='Append to existing events instead of overwriting')
    args = parser.parse_args()
    
    # Run all scrapers
    event_files = run_scrapers()
    
    # If no scrapers ran successfully, exit
    if not event_files:
        logging.error("No events collected. Exiting.")
        return 1
    
    # Combine event files
    combined_file = combine_event_files(event_files)
    if not combined_file:
        logging.error("Failed to combine event files. Exiting.")
        return 1
    
    # Run categorization
    success = run_categorization(append_to_existing=args.append)
    if not success:
        logging.error("Categorization failed. Exiting.")
        return 1
    
    # Copy final output to public directory
    categorized_events_file = os.path.join(DATA_DIR, "all_events_categorized.json")
    public_events_file = os.path.join(PUBLIC_DATA_DIR, "events.json")
    try:
        shutil.copy2(categorized_events_file, public_events_file)
        logging.info(f"Successfully copied events to {public_events_file}")
    except Exception as e:
        logging.error(f"Failed to copy events to public directory: {str(e)}")
        return 1
    
    # Report total time
    elapsed_time = time.time() - start_time
    logging.info(f"=== Process completed in {elapsed_time:.2f} seconds ===")
    return 0

if __name__ == "__main__":
    sys.exit(main()) 