import os
import json
import re
import requests
import logging
from typing import Dict, List, Optional
from googleapiclient.discovery import build
from datetime import datetime, timezone
import hashlib
from bs4 import BeautifulSoup
import sys

# Setup paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TECH_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(TECH_DIR, 'data')

# Import local modules
sys.path.append(SCRIPT_DIR)
from calendar_configs import GOOGLE_CALENDARS
from dotenv import load_dotenv

# Add import for Luma event details function
try:
    from ics_calendar_scraper import get_luma_event_details
except ImportError:
    # Define a fallback function if import fails
    def get_luma_event_details(url):
        logging.warning(f"Could not import get_luma_event_details, returning empty dict for {url}")
        return {}

# Load environment variables from .env.local
load_dotenv(dotenv_path=os.path.join(os.path.dirname(TECH_DIR), '.env.local'))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
)

# Load locations data
def load_locations() -> Dict:
    try:
        locations_file = os.path.join(DATA_DIR, 'locations.json')
        if not os.path.exists(locations_file):
            logging.warning(f"Locations file not found: {locations_file}")
            return {}
        
        with open(locations_file, 'r', encoding='utf-8') as f:
            return {loc['id']: loc for loc in json.load(f).get('locations', [])}
    except Exception as e:
        logging.error(f"Error loading locations: {e}")
        return {}

# Load communities data
def load_communities() -> Dict:
    try:
        communities_file = os.path.join(DATA_DIR, 'communities.json')
        if not os.path.exists(communities_file):
            logging.warning(f"Communities file not found: {communities_file}")
            return {}
            
        with open(communities_file, 'r', encoding='utf-8') as f:
            return {com['id']: com for com in json.load(f).get('communities', [])}
    except Exception as e:
        logging.error(f"Error loading communities: {e}")
        return {}

# Google Calendar Sources
API_KEY = os.getenv("GOOGLE_API_KEY")

if not API_KEY:
    logging.warning("Google API key not found. Set GOOGLE_API_KEY in .env.local file.")

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
    
    event_id = f"evt_{community_id}_{event['id'][:8]}"
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
        luma_details = get_luma_event_details(event_url)
    
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
    venue_type = "Offline"
    
    if location_id and location_id in LOCATIONS:
        location = LOCATIONS[location_id]
        venue_name = location.get('name', '')
        venue_address = location.get('address', event_location)
    
    # If Luma details have location type info, use it
    if luma_details and 'location_details' in luma_details:
        venue_type = luma_details['location_details'].get('type', venue_type)
    
    # Determine if registration is required based on event data
    registration_required = any(keyword in description.lower() 
                              for keyword in ['register', 'rsvp', 'ticket', 'sign up'])
    
    # Extract price information from description if available
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
    elif '$' in description:
        price_info["type"] = "Paid"
        price_info["details"] = "See event description for pricing details"
    
    # Use Luma categories if available, otherwise default
    categories = ["Tech"]
    if luma_details and 'categories' in luma_details and luma_details['categories']:
        categories = luma_details['categories']
    
    # Get event image from Luma if available
    image = ""
    if luma_details and 'image_url' in luma_details:
        image_url = luma_details['image_url']
        if image_url:
            # Generate a filename from the URL
            image_hash = hashlib.md5(image_url.encode()).hexdigest()[:8]
            image = f"luma-event-{image_hash}.jpg"
    
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
    event_title = event.get('summary', '')
    if luma_details and 'title' in luma_details and luma_details['title']:
        # Only use Luma title if it's different and not empty
        if luma_details['title'] != event_title:
            event_title = luma_details['title']
    
    return {
        "id": event_id,
        "name": event_title,
        "type": categories[0] if categories else "Tech",
        "locationId": location_id,
        "communityId": community_id,
        "description": enhanced_description,
        "startDate": start,
        "endDate": end,
        "category": categories,
        "price": price_info,
        "capacity": capacity,
        "registrationRequired": registration_required,
        "tags": "",
        "image": image,
        "status": "upcoming",
        "metadata": {
            "source_url": event_url if event_url else event.get('htmlLink', ''),
            "organizer": {
                "name": event.get('organizer', {}).get('displayName', ''),
                "instagram": "",
                "email": event.get('organizer', {}).get('email', '')
            },
            "venue": {
                "name": venue_name,
                "address": venue_address,
                "type": venue_type
            },
            "speakers": speakers,
            "social_links": social_links,
            "featured": False,
            "luma_source": True if event_url and 'lu.ma' in event_url else False
        }
    }

def fetch_google_calendar_events(calendar_id: str, community_id: str) -> List[Dict]:
    """Fetch events from a Google Calendar."""
    events = []
    
    if not API_KEY:
        logging.error("No Google API key available. Skipping calendar fetch.")
        return events
    
    try:
        # Create a service object
        service = build('calendar', 'v3', developerKey=API_KEY, cache_discovery=False)
        
        # Get current time and one year from now
        now = datetime.now(timezone.utc)
        one_year_from_now = datetime(now.year + 1, now.month, now.day, tzinfo=timezone.utc)
        
        # Fetch events
        events_result = service.events().list(
            calendarId=calendar_id,
            timeMin=now.isoformat(),
            timeMax=one_year_from_now.isoformat(),
            singleEvents=True,
            orderBy='startTime',
            maxResults=100
        ).execute()
        
        raw_events = events_result.get('items', [])
        
        # Process each event
        for event in raw_events:
            try:
                formatted_event = format_google_event(event, community_id)
                events.append(formatted_event)
            except Exception as e:
                logging.error(f"Error formatting event {event.get('summary', 'Unnamed event')}: {e}")
                continue
                
        logging.info(f"Fetched {len(events)} events from calendar {calendar_id} for community {community_id}")
        return events
        
    except Exception as e:
        logging.error(f"Error fetching Google Calendar events: {e}")
        return events

def is_future_event(event: Dict) -> bool:
    """Check if event hasn't ended yet"""
    try:
        end_date_str = event.get('endDate')
        if not end_date_str:
            return True  # Assume ongoing if no end date
            
        # Parse both date-only and datetime formats
        if 'T' in end_date_str:
            end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
        else:
            end_date = datetime.fromisoformat(end_date_str).replace(tzinfo=timezone.utc)
            
        return end_date > datetime.now(timezone.utc)
        
    except Exception as e:
        print(f"Error parsing date for event {event.get('id')}: {e}")
        return False  # Exclude events with invalid dates

def main():
    all_events = []
    
    # Fetch Google Calendar events
    logging.info("Fetching Google Calendar events...")
    for calendar_name, config in GOOGLE_CALENDARS.items():
        logging.info(f"Fetching events for {calendar_name}...")
        google_events = fetch_google_calendar_events(config["id"], config["community_id"])
        all_events.extend(google_events)
    
    # Filter out past events
    filtered_events = [event for event in all_events if is_future_event(event)]
    
    # Save filtered events to file
    output = {"events": filtered_events}
    
    # Create data directory if it doesn't exist
    os.makedirs(DATA_DIR, exist_ok=True)
    
    output_file = os.path.join(DATA_DIR, 'google_calendar_events.json')
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    logging.info(f"Total future events collected: {len(filtered_events)}")
    logging.info(f"Saved {len(filtered_events)} events to {output_file}")
    
    return output_file

if __name__ == '__main__':
    main() 