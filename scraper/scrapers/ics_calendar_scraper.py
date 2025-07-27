import os
import json
import requests
import hashlib
import logging
import pytz
import re
from bs4 import BeautifulSoup
from typing import Dict, List, Optional
from datetime import datetime
from ics import Calendar, Event
from .calendar_configs import ICS_CALENDARS
from .utils import get_luma_event_details

# Setup paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
# Path to the project root
PROJECT_ROOT = os.path.dirname(os.path.dirname(SCRIPT_DIR))

# Directory for reading config files like communities.json
CONFIG_DATA_DIR = os.path.join(PROJECT_ROOT, 'public', 'data')

# Directory for scraper's own output
OUTPUT_DATA_DIR = os.path.join(PROJECT_ROOT, 'scraper', 'data')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.FileHandler('scraper.log'), logging.StreamHandler()]
)

# Load communities data
communities = {}
try:
    communities_file = os.path.join(CONFIG_DATA_DIR, 'communities.json')
    if os.path.exists(communities_file):
        with open(communities_file, 'r') as f:
            communities = {com['id']: com for com in json.load(f).get('communities', [])}
    else:
        logging.warning(f"Communities file not found: {communities_file} (Looking in public/data/)")
except Exception as e:
    logging.error(f"Error loading communities data from {CONFIG_DATA_DIR}: {e}")

def is_nyc_event(event_data):
    """Check if an event is in NYC based on geographic coordinates, location, or title"""
    # NYC bounding box (approximate)
    NYC_LAT_MIN, NYC_LAT_MAX = 40.4, 41.0
    NYC_LON_MIN, NYC_LON_MAX = -74.3, -73.7
    
    # Check GEO coordinates first
    geo = event_data.get('geo', '')
    if geo:
        try:
            # Parse geo coordinates (format: "lat;lon")
            if ';' in geo:
                lat_str, lon_str = geo.split(';')
                lat, lon = float(lat_str), float(lon_str)
                if NYC_LAT_MIN <= lat <= NYC_LAT_MAX and NYC_LON_MIN <= lon <= NYC_LON_MAX:
                    return True
        except (ValueError, IndexError):
            pass
    
    # Check location field for NYC indicators
    location = event_data.get('location', '').lower()
    if any(nyc_indicator in location for nyc_indicator in [
        'new york', 'nyc', 'manhattan', 'brooklyn', 'queens', 
        'bronx', 'staten island', 'ny ', ', ny'
    ]):
        return True
    
    # Check event title/summary for NYC indicators
    summary = event_data.get('summary', '').lower()
    if any(nyc_indicator in summary for nyc_indicator in [
        'nyc', 'new york city', 'manhattan', 'brooklyn'
    ]):
        return True
    
    return False

def get_luma_events(ics_url, filter_nyc=False):
    """Fetch and parse Luma calendar events from ICS feed"""
    try:
        logging.info(f"Fetching ICS feed from: {ics_url}")
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(ics_url, headers=headers, timeout=10)
        response.raise_for_status()
        
        if not response.text:
            logging.error(f"Empty response from ICS feed: {ics_url}")
            return []
            
        logging.info(f"Successfully fetched ICS feed, size: {len(response.text)} bytes")
        cal = Calendar(response.text)
        events = []
        now = datetime.now(pytz.utc)
        
        for event in cal.events:
            try:
                # Skip past events (end time in past)
                if event.end < now:
                    continue
                
                # Get event URL from:
                # 1. URL property
                # 2. Location field if it contains a Luma URL
                # 3. Description field if it contains a Luma URL
                event_url = getattr(event, 'url', '')
                location = getattr(event, 'location', '')
                description = getattr(event, 'description', '')
                
                # Check if location is a Luma URL
                if not event_url and location and 'lu.ma' in location:
                    event_url = location
                    
                # Alternative: Extract URL from description if needed
                if not event_url and description:
                    urls = re.findall(r'https?://lu\.ma/\S+', description)
                    if urls:
                        event_url = urls[0]
                
                # Get detailed event information if we have a URL
                event_details = get_luma_event_details(event_url) if event_url else None
                
                # Create event data
                event_data = {
                    "uid": getattr(event, 'uid', ''),
                    "summary": getattr(event, 'name', ''),
                    "start": event.begin.datetime,
                    "end": event.end.datetime,
                    "location": location,
                    "description": description,
                    "organizer": getattr(event, 'organizer', ''),
                    "geo": getattr(event, 'geo', ''),
                    "url": event_url,
                    "additional_details": event_details
                }
                
                # Apply NYC filtering if requested
                if filter_nyc and not is_nyc_event(event_data):
                    continue
                    
                events.append(event_data)
            except Exception as e:
                logging.error(f"Error processing event: {getattr(event, 'name', 'Unknown Event')} - {e}")
                continue
        
        logging.info(f"Found {len(events)} upcoming events")
        return events
    except requests.exceptions.RequestException as e:
        logging.error(f"Failed to fetch or parse ICS feed: {ics_url}. Error: {e}")
        return []
    except Exception as e:
        logging.error(f"Unexpected error processing ICS feed: {e}")
        return []

def parse_location(raw_location):
    """Parse location string into a structured dictionary"""
    if not raw_location:
        return {
            'venue': '', 'street': '', 'city': '', 'state': '', 'zip': '',
            'country': '', 'type': 'Online'
        }
    
    # Check for online/TBA locations
    if any(keyword in raw_location.lower() for keyword in ['online', 'tba', 'tbd', 'see description']):
        return {
            'venue': raw_location, 'street': '', 'city': '', 'state': '', 'zip': '',
            'country': '', 'type': 'Online'
        }
    
    # Try to parse as structured address
    parts = [p.strip() for p in raw_location.split(',')]
    location_data = {'venue': '', 'street': '', 'city': '', 'state': '', 'zip': '', 'country': '', 'type': 'Offline'}
    
    # Simple logic (can be improved with a proper library like usaddress)
    if len(parts) >= 3:
        location_data['venue'] = parts[0]
        location_data['street'] = parts[0] # Often venue and street are the same
        location_data['city'] = parts[1]
        state_zip = parts[2].split()
        if len(state_zip) == 2:
            location_data['state'] = state_zip[0]
            location_data['zip'] = state_zip[1]
    elif len(parts) == 1:
        location_data['venue'] = parts[0]
    
    return location_data

def clean_description(desc):
    """Clean HTML and other artifacts from description"""
    if not desc:
        return ""
    # Use BeautifulSoup to parse and get text
    soup = BeautifulSoup(desc, 'html.parser')
    return soup.get_text(separator='\n', strip=True)

def parse_price(desc):
    """Extract price information from description"""
    if not desc:
        return {"amount": 0, "type": "Free", "currency": "USD", "details": ""}
        
    # Search for price patterns
    match = re.search(r'\$(\d+(\.\d+)?)', desc)
    if match:
        return {
            "amount": float(match.group(1)),
            "type": "Paid",
            "currency": "USD",
            "details": f"Price found in description: {match.group(0)}"
        }
    
    # Check for "free" keyword
    if 'free' in desc.lower() and 'free of charge' in desc.lower():
        return {"amount": 0, "type": "Free", "currency": "USD", "details": "Event is free"}
        
    return {"amount": 0, "type": "Free", "currency": "USD", "details": "No price information found"}

def extract_speakers(desc):
    """Extract speaker names from description (basic implementation)"""
    speakers = []
    if 'speaker:' in desc.lower():
        # Find text after "Speaker:"
        try:
            speaker_section = desc.lower().split('speaker:')[1]
            # Simple split by common delimiters
            potential_speakers = re.split(r',| and |&', speaker_section)
            for speaker in potential_speakers:
                if speaker.strip():
                    speakers.append({"name": speaker.strip().title(), "title": "", "bio": ""})
        except IndexError:
            pass # No speaker section found
    return speakers

def convert_ics_event(ics_event: Dict, community_id: str) -> Dict:
    """Convert a parsed ICS event into our standard event format."""
    event_details = ics_event.get("additional_details", {}) or {}
    
    # Generate a unique event ID
    event_id_str = f"{ics_event['uid']}{ics_event['summary']}{ics_event['start']}"
    event_id_hash = hashlib.md5(event_id_str.encode()).hexdigest()[:8]
    event_id = f"evt_ics_{community_id}_{event_id_hash}"
    
    # Clean description
    description = clean_description(ics_event.get('description', ''))
    
    # Override with more detailed description from Luma if available
    if event_details.get('full_description'):
        description = event_details['full_description']
    
    # Location handling
    location_str = ics_event.get('location', '')
    location_type = 'Offline'
    
    luma_location = event_details.get('location_details', {})
    if luma_location:
        if luma_location.get('venue_name') and luma_location.get('address'):
            location_str = f"{luma_location['venue_name']}, {luma_location['address']}"
        elif luma_location.get('venue_name'):
            location_str = luma_location['venue_name']
        
        if luma_location.get('type'):
            location_type = luma_location['type']
            
    location_info = parse_location(location_str)
    
    # Price
    price_info = parse_price(description)
    if 'price_info' in event_details and event_details['price_info']:
        price_info = event_details['price_info']
        
    # Speakers
    speakers = extract_speakers(description)
    if 'speakers' in event_details and event_details['speakers']:
        speakers = event_details['speakers']
    
    # Categories / Tags
    tags = event_details.get('categories', [])
    
    # Image URL
    image_url = event_details.get('image_url', '')
    
    # Construct the final event object
    event = {
        "id": event_id,
        "title": event_details.get('title', ics_event.get('summary', 'Untitled Event')),
        "description": description,
        "start_time": ics_event['start'].isoformat(),
        "end_time": ics_event['end'].isoformat(),
        "url": ics_event.get('url', ''),
        "community_id": community_id,
        "location": {
            "name": location_info['venue'],
            "address": location_str,
            "type": location_type
        },
        "price": price_info,
        "tags": tags,
        "speakers": speakers,
        "images": [{"url": image_url}] if image_url else [],
        "last_updated": datetime.now(pytz.utc).isoformat(),
        "misc": {
            "source_event_id": ics_event.get('uid'),
            "source": "ics",
            "raw_location": ics_event.get('location', ''),
            "organizer": ics_event.get('organizer', '')
        }
    }
    
    return event

def is_future_event(event: Dict) -> bool:
    """Check if the event's start time is in the future."""
    try:
        start_time = None
        # Handle both raw ICS events (with 'start') and converted events (with 'start_time')
        if 'start_time' in event:
            # This is a converted event
            start_time = event['start_time']
            if isinstance(start_time, str):
                # fromisoformat doesn't like spaces
                start_time = datetime.fromisoformat(start_time.replace(" ", "T"))
        elif 'start' in event:
            # This is a raw ICS event from the initial fetch
            start_time = event['start']
            if hasattr(start_time, 'datetime'):
                start_time = start_time.datetime
        else:
            logging.error(f"Event has no start time field: {event.keys()}")
            return False

        if not start_time:
            logging.error(f"Could not determine start time for event.")
            return False
            
        if start_time.tzinfo is None:
            start_time = pytz.utc.localize(start_time)
            
        return start_time > datetime.now(pytz.utc)
    except Exception as e:
        logging.error(f"Could not parse event start time: {event.get('start_time', event.get('start', 'Unknown'))} - {e}")
        return False

def main():
    """Main function to run the ICS scraper"""
    logging.info("Starting ICS calendar processing...")
    
    if not isinstance(ICS_CALENDARS, list):
        logging.error("ICS_CALENDARS is not a list. Please check calendar_configs.py")
        return []
    
    all_events = []
    
    # Iterate over each calendar configuration
    for cal_info in ICS_CALENDARS:
        try:
            community_id = cal_info.get('community_id')
            ics_url = cal_info.get('url')
            cal_name = cal_info.get('name', 'Unknown')
            filter_nyc = cal_info.get('filter_nyc', False)

            if not community_id or not ics_url:
                logging.warning(f"Skipping calendar '{cal_name}' due to missing 'community_id' or 'url'.")
                continue
        
            logging.info(f"Processing calendar for community: {community_id} (NYC filter: {filter_nyc})")
            
            # Fetch events from the ICS feed
            luma_events = get_luma_events(ics_url, filter_nyc=filter_nyc)
            
            # Convert and filter for future events
            future_events = [
                convert_ics_event(event, community_id)
                for event in luma_events
                if is_future_event(event)
            ]
            
            all_events.extend(future_events)
            logging.info(f"Found {len(future_events)} future events for {community_id}")

        except Exception as e:
            logging.error(f"Failed to process calendar '{cal_info.get('name', 'Unknown')}': {e}")
            continue
            
    # Save the combined list of events
    output_path = os.path.join(OUTPUT_DATA_DIR, 'ics_events.json')
    try:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(all_events, f, indent=2, default=str)
        logging.info(f"Successfully saved {len(all_events)} events to {output_path}")
    except Exception as e:
        logging.error(f"Error saving events to {output_path}: {e}")

    return output_path

if __name__ == "__main__":
    main() 