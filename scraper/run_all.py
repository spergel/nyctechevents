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
import atexit
import signal

# Add the parent directory (project root) to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import scrapers list
from scraper.scrapers.calendar_configs import SCRAPERS

# Setup paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__)) # Will be scraper/
# TECH_DIR will now point to the project root if script is in scraper/
TECH_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(SCRIPT_DIR, 'data') # Correctly scraper/data

# Ensure data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

# Configure logging
log_file_handler = None
cleanup_registered = False

def setup_logging():
    global log_file_handler, cleanup_registered
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    
    # Create formatters
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    
    # Create handlers
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    
    log_file_handler = logging.FileHandler('scraper.log')
    log_file_handler.setFormatter(formatter)
    
    # Add handlers to logger
    root_logger.addHandler(console_handler)
    root_logger.addHandler(log_file_handler)
    
    # Register cleanup function
    if not cleanup_registered:
        atexit.register(cleanup_logging)
        cleanup_registered = True
    
def cleanup_logging():
    """Safely clean up logging handlers to avoid 'Bad file descriptor' errors"""
    global log_file_handler
    
    # Get the root logger
    root_logger = logging.getLogger()
    
    # Remove and close handlers safely
    if log_file_handler:
        try:
            # First remove the handler from the logger
            root_logger.removeHandler(log_file_handler)
            # Then close it
            log_file_handler.close()
            log_file_handler = None
        except (OSError, ValueError):
            # Ignore errors during cleanup - they happen when
            # file descriptors are already closed
            pass
    
    # Safely remove any other handlers
    for handler in root_logger.handlers[:]:
        try:
            # Only try to close file handlers, not stream handlers
            # as stdout might already be closed
            if isinstance(handler, logging.FileHandler):
                root_logger.removeHandler(handler)
                handler.close()
        except (OSError, ValueError):
            pass

def shutdown_cleanly():
    """Cleanly shut down the program, ensuring exit code 0"""
    try:
        # Unregister atexit handlers to prevent them from running
        if 'unregister' in dir(atexit):  # Python 3.9+
            atexit.unregister(cleanup_logging)
        
        # Get the root logger and remove all handlers
        root_logger = logging.getLogger()
        
        # Remove all handlers without closing them
        for handler in root_logger.handlers[:]:
            root_logger.removeHandler(handler)
        
        # Make sure no buffered data is left
        sys.stdout.flush()
        sys.stderr.flush()
        
        # Exit the process with explicit success code
        os._exit(0)  # Use os._exit instead of sys.exit
    except:
        # If anything goes wrong, still try to exit cleanly
        os._exit(0)

# Register signal handlers for clean exit
signal.signal(signal.SIGTERM, lambda signum, frame: shutdown_cleanly())
signal.signal(signal.SIGINT, lambda signum, frame: shutdown_cleanly())

# Initialize logging
setup_logging()

def run_scrapers() -> List[str]:
    """Run all scrapers and return list of output files."""
    output_files = []
    successful_scrapers = 0
    failed_scrapers = 0
    
    for scraper_name in SCRAPERS:
        try:
            logging.info(f"Attempting to run scraper: {scraper_name}")
            # Import the scraper module from scraper.scrapers
            scraper_module = importlib.import_module(f'scraper.scrapers.{scraper_name}')
            logging.info(f"Running scraper: {scraper_name}")
            
            # Run the scraper
            output_file = scraper_module.main()
            if output_file:
                output_files.append(output_file)
                successful_scrapers += 1
                logging.info(f"Scraper {scraper_name} completed successfully")
            else:
                logging.error(f"Scraper {scraper_name} failed to produce output")
                failed_scrapers += 1
                
        except ImportError as e:
            logging.error(f"Import error for scraper {scraper_name}: {e}")
            failed_scrapers += 1
        except Exception as e:
            logging.error(f"Error running scraper {scraper_name}: {e}")
            logging.error(traceback.format_exc())
            failed_scrapers += 1
            # Don't continue here - let the scraper try to complete even if there was an error
            # The scraper might still produce output despite the error
    
    logging.info(f"Completed running {successful_scrapers} scrapers successfully, {failed_scrapers} failed")
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
            # Skip non-string file paths (like True/False values)
            if not isinstance(file_path, str):
                logging.warning(f"Skipping non-string file path: {file_path}")
                continue
                
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, dict) and 'events' in data:
                    all_events.extend(data['events'])
                elif isinstance(data, list):
                    all_events.extend(data)
        except FileNotFoundError:
            logging.error(f"File not found: {file_path}")
            continue
        except json.JSONDecodeError:
            logging.error(f"Invalid JSON in file: {file_path}")
            continue
        except Exception as e:
            logging.error(f"Error reading file {file_path}: {e}")
            continue
    
    if not all_events:
        logging.warning("No events collected. Exiting.")
        return None
    
    # Create data directory if it doesn't exist (DATA_DIR is scraper/data)
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
        # root_dir calculation in categorize_events.py is updated to handle its new location
        
        # Import categorize_main from scraper.categorize_events
        from scraper.categorize_events import main as categorize_main
        categorize_main(input_file, output_file)
        return True
    except Exception as e:
        logging.error(f"Error running categorization: {e}")
        return False

def main():
    """Main function to run all scrapers and combine results."""
    success = False
    
    try:
        # Parse command line arguments
        parser = argparse.ArgumentParser(description='Run all scrapers and combine results')
        parser.add_argument('--append', action='store_true', help='Append to existing events')
        parser.add_argument('--output', help='Output file path')
        parser.add_argument('-v', '--verbose', action='store_true', help='Enable verbose logging')
        args = parser.parse_args()
        
        # Set logging level based on verbose flag
        if args.verbose:
            logging.getLogger().setLevel(logging.DEBUG)
            logging.debug("Verbose logging enabled")
        
        # Run scrapers
        event_files = run_scrapers()
        
        if not event_files:
            logging.error("No event files were generated. Exiting.")
            return
            
        logging.debug(f"Generated event files: {event_files}")
        
        # Combine event files
        combined_file = combine_event_files(event_files)
        
        if not combined_file:
            logging.error("Failed to combine event files. Exiting.")
            return
        
        # Run categorization
        final_output_file = os.path.join(TECH_DIR, 'public', 'data', 'events.json')
        if not run_categorization(combined_file, final_output_file):
            logging.error("Categorization failed. Exiting.")
            return
        
            success = True
                
    except Exception as e:
        logging.error(f"An unexpected error occurred in main: {e}")
        logging.error(traceback.format_exc())
    
    finally:
        if success:
            logging.info("Script completed successfully")
        else:
            logging.error("Script finished with errors")
        
        cleanup_logging()

if __name__ == "__main__":
    main()
    # Explicitly call shutdown_cleanly for a clean exit
    shutdown_cleanly() 