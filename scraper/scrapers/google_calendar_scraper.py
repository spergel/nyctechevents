import os
import json
import re
import requests
import logging
from typing import Dict, List, Optional
from googleapiclient.discovery import build
from datetime import datetime
import pytz
import hashlib
from bs4 import BeautifulSoup
import sys

# Setup paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
# Path to the project root (assuming this script is in src/scrapers/)
_PROJECT_ROOT = os.path.dirname(os.path.dirname(SCRIPT_DIR)) # This is now src/

# Directory for reading config files like communities.json and locations.json
CONFIG_DATA_DIR = os.path.join(_PROJECT_ROOT, 'public', 'data')

# Directory for scraper's own output and cache
# Output will be in PROJECT_ROOT/data/scrapers/
OUTPUT_DATA_DIR = os.path.join(_PROJECT_ROOT, 'data', 'scrapers')
CACHE_DIR = os.path.join(OUTPUT_DATA_DIR, 'cache', 'google_calendar') # Specific cache for this scraper

# Ensure cache directory exists
os.makedirs(CACHE_DIR, exist_ok=True)

# Import local modules
# Adjust import path for calendar_configs
sys.path.append(os.path.join(SCRIPT_DIR, '../configs')) # Add parent of SCRIPT_DIR to path
from calendar_configs import GOOGLE_CALENDARS
from dotenv import load_dotenv

# Add import for Luma event details function
try:
    # Adjust import path for ics_calendar_scraper
    sys.path.append(SCRIPT_DIR) # Add SCRIPT_DIR to path if not already
    from ics_calendar_scraper import get_luma_event_details
except ImportError:
    # Define a fallback function if import fails
    def get_luma_event_details(url):
        logging.warning(f"Could not import get_luma_event_details, returning empty dict for {url}")
        return {}

# Load environment variables from .env.local in the project root
dotenv_path = os.path.join(_PROJECT_ROOT, '.env.local')
load_dotenv(dotenv_path=dotenv_path)
logging.info(f"Attempting to load .env.local from: {dotenv_path}")


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
)

# Load locations data
def load_locations() -> Dict:
    try:
        locations_file = os.path.join(CONFIG_DATA_DIR, 'locations.json')
        if not os.path.exists(locations_file):
            logging.warning(f"Locations file not found: {locations_file}")
            return {}
        
        with open(locations_file, 'r', encoding='utf-8') as f:
            return {loc['id']: loc for loc in json.load(f).get('locations', [])}
    except Exception as e:
        logging.error(f"Error loading locations from {CONFIG_DATA_DIR}: {e}")
        return {}

# Load communities data
def load_communities() -> Dict:
    try:
        communities_file = os.path.join(CONFIG_DATA_DIR, 'communities.json')
        if not os.path.exists(communities_file):
            logging.warning(f"Communities file not found: {communities_file}")
            return {}
            
        with open(communities_file, 'r', encoding='utf-8') as f:
            return {com['id']: com for com in json.load(f).get('communities', [])}
    except Exception as e:
        logging.error(f"Error loading communities from {CONFIG_DATA_DIR}: {e}")
        return {}

# Google Calendar Sources
API_KEY = os.getenv("GOOGLE_API_KEY")

if not API_KEY:
    logging.warning("Google API key not found. Set GOOGLE_API_KEY in .env.local file or environment variables.")
    # Attempting to load again, just in case (though load_dotenv was called earlier)
    load_dotenv(dotenv_path=dotenv_path)
    API_KEY = os.getenv("GOOGLE_API_KEY")
    if API_KEY:
        logging.info("Google API key loaded successfully after second attempt.")
    else:
        logging.error("Google API key still not found after attempting to load from .env.local. Scraper may not function correctly.")


LOCATIONS = load_locations()
COMMUNITIES = load_communities()

def get_location_id(event_location: str, community_id: str) -> str:
    """
    Determine the location ID based on event location and community.
    Returns empty string if no match found.
    """
    # Direct community to location mappings
    COMMUNITY_DEFAULT_LOCATIONS = {
        "com_woodbine": "loc_woodbine",
        "com_principles": "loc_principles"
    }
    
    # If community has a default location, use it
    if community_id in COMMUNITY_DEFAULT_LOCATIONS:
        return COMMUNITY_DEFAULT_LOCATIONS[community_id]
        
    if not event_location and not community_id:
        return ""
        
    # First check if this community has a default location
    community = COMMUNITIES.get(community_id, {})
    meeting_locations = community.get('meetingLocationIds', [])
    
    # If community has exactly one meeting location, use it as default
    if len(meeting_locations) == 1:
        return meeting_locations[0]
    
    # If no event location provided, return empty
    if not event_location:
        return ""
    
    # Clean the event location for matching
    event_location_clean = event_location.lower().strip()
    
    # First try to match against community's meeting locations
    for loc_id in meeting_locations:
        location = LOCATIONS.get(loc_id, {})
        if location:
            # Check if location name or address matches
            if (location.get('name', '').lower() in event_location_clean or 
                location.get('address', '').lower() in event_location_clean):
                return loc_id
    
    # If no match in community locations, try all locations
    for loc_id, location in LOCATIONS.items():
        # Check if location name or address matches
        if (location.get('name', '').lower() in event_location_clean or 
            location.get('address', '').lower() in event_location_clean):
            return loc_id
    
    return ""

def extract_event_url(text: str) -> Optional[str]:
    """Extract Luma or Eventbrite event URL from text if present"""
    if not text:
        return None
        
    # Look for common patterns in Google Calendar description
    patterns = [
        r'(?:Get up-to-date information at:|More info:|RSVP:|Register:)\s*(https?://(?:lu\.ma|www\.eventbrite\.com)/\S+)',
        r'(https?://(?:lu\.ma|www\.eventbrite\.com)/\S+)'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(1).strip()
            
    return None

def format_google_event(event: Dict, community_id: str) -> Dict:
    """Format a Google Calendar event into our standard event format."""
    start = event.get('start', {}).get('dateTime', event.get('start', {}).get('date'))
    end = event.get('end', {}).get('dateTime', event.get('end', {}).get('date'))
    
    event_id_suffix = hashlib.md5(event['id'].encode()).hexdigest()[:8]
    event_id = f"evt_gcal_{community_id}_{event_id_suffix}"
    description = event.get('description', '')
    
    # Get location from event
    event_location = event.get('location', '')
    
    # Try to extract event URL from description
    event_url = extract_event_url(description)
    
    # If no URL found in description, try location field
    if not event_url and event_location:
        event_url = extract_event_url(event_location)
    
    luma_details = None
    
    # If we found a Luma URL, fetch additional details
    if event_url and 'lu.ma' in event_url:
        logging.info(f"Found Luma URL in Google Calendar event: {event_url}")
        luma_details = get_luma_event_details(event_url) # Assuming get_luma_event_details is correctly imported
    
    # If Luma details have better location info, use it
    if luma_details and 'location_details' in luma_details:
        loc_details = luma_details['location_details']
        if loc_details.get('venue_name') or loc_details.get('address'):
            if loc_details.get('venue_name') and loc_details.get('address'):
                event_location = f"{loc_details['venue_name']}\n{loc_details['address']}"
            elif loc_details.get('venue_name'):
                event_location = loc_details['venue_name']
            elif loc_details.get('address'):
                event_location = loc_details['address']
    
    # Get location ID using the updated function
    location_id = get_location_id(event_location, community_id)
    
    # Get venue details based on location ID
    venue_name = ""
    venue_address = event_location
    venue_type = "Offline" # Default to Offline
    
    if location_id and location_id in LOCATIONS:
        location_data = LOCATIONS[location_id]
        venue_name = location_data.get('name', '')
        venue_address = location_data.get('address', event_location)
        # Use location type if available, otherwise keep default
        venue_type = location_data.get('type', venue_type) 
    
    # If Luma details have location type info, it might override the one from LOCATIONS
    if luma_details and 'location_details' in luma_details:
        luma_venue_type = luma_details['location_details'].get('type')
        if luma_venue_type: # Only override if Luma provides a type
            venue_type = luma_venue_type
    
    # Determine if registration is required based on event data
    registration_required = any(keyword in description.lower() 
                              for keyword in ['register', 'rsvp', 'ticket', 'sign up']) \
                              or (luma_details and luma_details.get('registration_required', False))

    
    # Extract price information
    price_info = {
        "amount": 0,
        "type": "Free",
        "currency": "USD",
        "details": ""
    }
    
    # Use Luma price info if available
    if luma_details and 'price_info' in luma_details:
        price_info = luma_details['price_info']
    # Otherwise, look for price information in description
    elif '$' in description or any(term in description.lower() for term in ["price:", "cost:", "fee:"]):
        price_info["type"] = "Paid"
        price_info["details"] = "See event description for pricing details"
        # Try to extract amount if possible (basic extraction)
        price_match = re.search(r'\$(\d+(\.\d{2})?)', description)
        if price_match:
            try:
                price_info["amount"] = float(price_match.group(1))
            except ValueError:
                pass # Keep amount 0 if parsing fails
    
    # Use Luma categories if available, otherwise default
    categories = ["Tech"] # Default category
    if community_id in COMMUNITIES: # Check if community_id is valid
        community_categories = COMMUNITIES[community_id].get('tags')
        if community_categories and isinstance(community_categories, list) and len(community_categories) > 0:
            categories = community_categories # Use community tags as categories

    if luma_details and 'categories' in luma_details and luma_details['categories']:
        # Merge Luma categories with community categories, avoiding duplicates
        for cat in luma_details['categories']:
            if cat not in categories:
                categories.append(cat)
    
    # Get event image from Luma if available
    image_filename = ""
    if luma_details and 'image_url' in luma_details:
        image_url = luma_details['image_url']
        if image_url:
            # Generate a filename from the URL
            image_hash = hashlib.md5(image_url.encode()).hexdigest()[:8]
            # Define image path relative to public/images/events/
            # This will be used in the `image` field of the event
            image_filename = f"events/luma-event-{image_hash}.jpg" # Relative path for frontend
            
            # Actual download path for the image
            image_download_path = os.path.join(_PROJECT_ROOT, 'public', 'images', 'events')
            os.makedirs(image_download_path, exist_ok=True)
            full_image_path = os.path.join(image_download_path, f"luma-event-{image_hash}.jpg")

            # Download and save image if not already present
            if not os.path.exists(full_image_path):
                try:
                    img_response = requests.get(image_url, stream=True)
                    if img_response.status_code == 200:
                        with open(full_image_path, 'wb') as img_f:
                            for chunk in img_response.iter_content(1024):
                                img_f.write(chunk)
                        logging.info(f"Downloaded image for event {event_id} to {full_image_path}")
                    else:
                        logging.warning(f"Failed to download image {image_url} for event {event_id}. Status: {img_response.status_code}")
                        image_filename = "" # Reset if download fails
                except Exception as img_e:
                    logging.error(f"Error downloading image {image_url} for event {event_id}: {img_e}")
                    image_filename = "" # Reset on error
    
    # Use Luma full description if available and more detailed
    enhanced_description = description
    if luma_details and 'full_description' in luma_details:
        luma_desc = luma_details['full_description']
        # Always use the Luma description when available
        enhanced_description = luma_desc
    
    # Get speakers from Luma details if available
    speakers = []
    if luma_details and 'speakers' in luma_details:
        speakers = luma_details['speakers']
    
    # Extract capacity info if available
    capacity = None
    if luma_details and 'actual_capacity' in luma_details:
        capacity = luma_details['actual_capacity']
    
    # Get social links if available
    social_links = []
    if luma_details and 'social_links' in luma_details:
        social_links = luma_details['social_links']
    
    # Use Luma title if available and different
    event_title = event.get('summary', 'Unnamed Event') # Provide a default title
    if luma_details and 'title' in luma_details and luma_details['title']:
        # Only use Luma title if it's different and not empty
        if luma_details['title'] != event_title:
            event_title = luma_details['title']
    
    # Determine the source URL
    source_url_to_use = event.get('htmlLink', '') # Default to Google Calendar event link
    if event_url: # If a Luma/Eventbrite URL was extracted
        source_url_to_use = event_url
    else: # No Luma/Eventbrite URL, try community website
        community_website = COMMUNITIES.get(community_id, {}).get('website')
        if community_website:
            source_url_to_use = community_website

    return {
        "id": event_id,
        "name": event_title,
        "type": categories[0] if categories else "Tech", # Use first category as main type
        "locationId": location_id,
        "communityId": community_id,
        "description": enhanced_description,
        "startDate": start,
        "endDate": end,
        "category": categories, # Store all categories
        "price": price_info,
        "capacity": capacity,
        "registrationRequired": registration_required,
        "tags": [], # Deprecated or handle differently - using category now
        "image": image_filename, # Use the relative path for the image
        "status": "upcoming",
        "metadata": {
            "source": "Google Calendar", # Indicate source
            "source_url": source_url_to_use,
            "original_event_id": event['id'], # Store original Google Calendar event ID
            "organizer": {
                "name": event.get('organizer', {}).get('displayName', COMMUNITIES.get(community_id, {}).get('name', '')),
                "instagram": COMMUNITIES.get(community_id, {}).get('socialMedia', {}).get('instagram', ''),
                "email": event.get('organizer', {}).get('email', '')
            },
            "venue": {
                "name": venue_name,
                "address": venue_address,
                "type": venue_type
            },
            "speakers": speakers,
            "social_links": social_links,
            "featured": False, # Default featured status
            "luma_source": True if event_url and 'lu.ma' in event_url else False,
            "google_calendar_link": event.get('htmlLink', '') # Explicitly store Google Calendar link
        }
    }

def fetch_google_calendar_events(calendar_id: str, community_id: str) -> List[Dict]:
    """Fetch events from a Google Calendar."""
    events = []
    
    if not API_KEY:
        logging.error("No Google API key available. Skipping calendar fetch.")
        return events # Return empty list, no fallback to cache here as main() handles that
    
    try:
        # Create a service object
        service = build('calendar', 'v3', developerKey=API_KEY, cache_discovery=False)
        
        # Get current time and one year from now
        now = datetime.now(pytz.utc)
        one_year_from_now = datetime(now.year + 1, now.month, now.day, tzinfo=pytz.utc)
        
        # Fetch events
        events_result = service.events().list(
            calendarId=calendar_id,
            timeMin=now.isoformat(),
            timeMax=one_year_from_now.isoformat(),
            singleEvents=True,
            orderBy='startTime',
            maxResults=100 # Max results per page (can be up to 2500)
        ).execute()
            
        raw_events = events_result.get('items', [])
            
        # Process each event
        for event_data in raw_events:
            try:
                # Skip events without a summary (title) as they are often problematic
                if not event_data.get('summary'):
                    logging.warning(f"Skipping event without summary (title) in calendar {calendar_id}. Event ID: {event_data.get('id')}")
                    continue
                formatted_event = format_google_event(event_data, community_id)
                events.append(formatted_event)
            except Exception as e:
                logging.error(f"Error formatting event '{event_data.get('summary', 'Unnamed event')}' (ID: {event_data.get('id')}) from calendar {calendar_id}: {e}", exc_info=True)
                continue
                    
        logging.info(f"Fetched {len(events)} events from calendar {calendar_id} for community {community_id}")
        
        # Cache events for this community (successful fetch)
        try:
            cache_file = os.path.join(CACHE_DIR, f"cache_gcal_{community_id}.json")
            os.makedirs(os.path.dirname(cache_file), exist_ok=True) # Ensure cache subdir exists
            with open(cache_file, 'w') as f:
                json.dump({"events": events, "timestamp": datetime.now().isoformat()}, f, indent=2)
            logging.info(f"Successfully cached {len(events)} events for Google Calendar {community_id} to {cache_file}")
        except Exception as e:
            logging.error(f"Could not cache events for Google Calendar {community_id}: {e}")

    except Exception as api_error:
        logging.error(f"API error fetching events for Google Calendar {calendar_id} (Community: {community_id}): {api_error}", exc_info=True)
        # Try to load cached data if API fails
        try:
            cache_file = os.path.join(CACHE_DIR, f"cache_gcal_{community_id}.json")
            if os.path.exists(cache_file):
                with open(cache_file, 'r') as f:
                    cached_data = json.load(f)
                    if 'events' in cached_data:
                        # Filter for future events from cache
                        cached_events = [e for e in cached_data['events'] if is_future_event(e)]
                        events.extend(cached_events) # Add to events list
                        logging.info(f"Loaded {len(cached_events)} future events from cache for Google Calendar {community_id} due to API error.")
            else:
                logging.warning(f"No cache file found for Google Calendar {community_id} at {cache_file} after API error.")
        except Exception as cache_error:
            logging.error(f"Could not load cached data for Google Calendar {community_id} after API error: {cache_error}")
            
    return events # Return whatever events were fetched or loaded from cache
        
def is_future_event(event: Dict) -> bool:
    """Check if event hasn't ended yet"""
    try:
        end_date_str = event.get('endDate')
        if not end_date_str:
            # If no end date, check start date. If start date is also missing, assume not future.
            start_date_str = event.get('startDate')
            if not start_date_str:
                return False 
            # If only start date, assume it's a single day event or ongoing if start is in future/today
            if 'T' in start_date_str:
                 start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
            else: # Date only
                 start_date = datetime.fromisoformat(start_date_str).replace(tzinfo=pytz.utc)
            return start_date >= datetime.now(pytz.utc).replace(hour=0, minute=0, second=0, microsecond=0)


        # Parse both date-only and datetime formats for end_date
        if 'T' in end_date_str: # Datetime with timezone
            end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
        else: # Date only, assume end of day in UTC
            end_date = datetime.fromisoformat(end_date_str).replace(hour=23, minute=59, second=59, tzinfo=pytz.utc)
            
        return end_date > datetime.now(pytz.utc)
        
    except Exception as e:
        logging.error(f"Error parsing date for event {event.get('id', 'Unknown ID')}: {e}. Event data: {event.get('startDate')}, {event.get('endDate')}")
        return False  # Exclude events with invalid dates

def main():
    all_events = []
    
    # Define the output file for this scraper
    output_file = os.path.join(OUTPUT_DATA_DIR, 'google_calendar_events.json')
    os.makedirs(OUTPUT_DATA_DIR, exist_ok=True) # Ensure output directory exists

    # Try to load existing events from this scraper's previous runs (from its specific output file)
    # This helps in preserving events if some calendars fail to fetch, but new fetches will overwrite.
    if os.path.exists(output_file):
        try:
            with open(output_file, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
                if 'events' in existing_data:
                    # Filter to keep only future events from the last successful run
                    # This acts as a fallback if all calendar fetches fail.
                    # New data from successful fetches will replace these.
                    existing_future_events = [e for e in existing_data['events'] if is_future_event(e)]
                    if existing_future_events:
                        # Add to a temporary list, to be merged carefully later
                        # We prioritize newly fetched data over these.
                        all_events.extend(existing_future_events) 
                        logging.info(f"Loaded {len(existing_future_events)} existing future events from previous run: {output_file}")
        except Exception as e:
            logging.error(f"Error loading existing events from {output_file}: {e}")
    
    # Fetch Google Calendar events
    logging.info("Fetching Google Calendar events...")
    fetched_events_current_run = []
    for calendar_name, config in GOOGLE_CALENDARS.items():
        community_id = config.get("community_id")
        calendar_api_id = config.get("id")

        if not community_id or not calendar_api_id:
            logging.warning(f"Skipping calendar {calendar_name} due to missing 'community_id' or 'id' in config.")
            continue

        logging.info(f"Fetching events for {calendar_name} (Community: {community_id}, Calendar ID: {calendar_api_id})...")
        google_events = fetch_google_calendar_events(calendar_api_id, community_id)
        fetched_events_current_run.extend(google_events)
        # Caching is handled within fetch_google_calendar_events
    
    # Merge and de-duplicate events
    # Prioritize newly fetched events.
    # `all_events` currently holds events from the previous run (if any).
    # `fetched_events_current_run` holds events fetched in this execution.

    final_events_map = {}
    # Add events from the previous run first (they will be overwritten by new data if IDs match)
    for event in all_events:
        if 'id' in event:
            final_events_map[event['id']] = event
    
    # Add newly fetched events, overwriting any existing ones with the same ID
    for event in fetched_events_current_run:
        if 'id' in event:
            final_events_map[event['id']] = event
            
    # Filter again to ensure all events in the final list are future events
    # This is important if some stale events were loaded from cache or previous output
    # and not overwritten by a new fetch for that specific source.
    processed_events = [event for event in final_events_map.values() if is_future_event(event)]
    
    # Save filtered events to file
    output_data = {
        "last_updated": datetime.now(pytz.utc).isoformat(),
        "source": "google_calendar_scraper.py",
        "events": processed_events
    }
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)
    
    logging.info(f"Total future events processed by Google Calendar scraper: {len(processed_events)}")
    logging.info(f"Saved {len(processed_events)} Google Calendar events to {output_file}")
    
    return output_file

if __name__ == '__main__':
    # This allows the script to be run directly for testing or cron jobs
    # Example: python src/scrapers/google_calendar_scraper.py
    
    # Ensure the script can find its modules when run directly
    current_script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(os.path.dirname(current_script_dir))
    
    # Add project root to sys.path to allow imports like from src.configs import ...
    if project_root not in sys.path:
        sys.path.insert(0, project_root)
        
    # Also ensure src directory is in sys.path for imports like from scrapers.calendar_configs import ...
    # (though relative imports should be preferred if structuring as a package)
    # For this specific case, calendar_configs is now in src/configs
    # The sys.path.append for calendar_configs earlier in the file should handle this if run directly
    # from the scrapers directory, but let's make it more robust for running from project root.
    
    # If we are in src/scrapers, and want to import from src/configs:
    # sys.path.append(os.path.join(current_script_dir, '..')) # Add src to path
    # from configs.calendar_configs import GOOGLE_CALENDARS
    # This is already handled by the sys.path.append('../configs') near the top.

    # For `from ics_calendar_scraper import get_luma_event_details`
    # If ics_calendar_scraper.py is in the same directory (src/scrapers)
    # No special sys.path manipulation needed if running from src/scrapers or if src/scrapers is in PYTHONPATH.
    # The sys.path.append(SCRIPT_DIR) should handle it for direct execution.

    main() 