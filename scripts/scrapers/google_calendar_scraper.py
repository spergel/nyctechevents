import os
import json
import re
import requests
import logging
from typing import Dict, List, Optional
from googleapiclient.discovery import build
from datetime import datetime, UTC
from calendar_configs import GOOGLE_CALENDARS
from dotenv import load_dotenv
from bs4 import BeautifulSoup

# Import the get_luma_event_details function from ics_calendar_scraper
from ics_calendar_scraper import get_luma_event_details

# Load environment variables from .env.local
load_dotenv(dotenv_path='../../.env.local')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
)

# Load locations data
def load_locations() -> Dict:
    try:
        with open('../../public/data/locations.json', 'r', encoding='utf-8') as f:
            return {loc['id']: loc for loc in json.load(f).get('locations', [])}
    except Exception as e:
        print(f"Error loading locations: {e}")
        return {}

# Load communities data
def load_communities() -> Dict:
    try:
        with open('../../public/data/communities.json', 'r', encoding='utf-8') as f:
            return {com['id']: com for com in json.load(f).get('communities', [])}
    except Exception as e:
        print(f"Error loading communities: {e}")
        return {}

# Google Calendar Sources

API_KEY = os.getenv("GOOGLE_API_KEY")
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

def extract_luma_url(text: str) -> Optional[str]:
    """Extract Luma event URL from text if present"""
    if not text:
        return None
        
    # Look for common patterns in Google Calendar description
    patterns = [
        r'(?:Get up-to-date information at:|More info:|RSVP:|Register:)\s*(https?://lu\.ma/\S+)',
        r'(https?://lu\.ma/\S+)'
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
    
    # Try to extract Luma event URL from description
    luma_url = extract_luma_url(description)
    luma_details = None
    
    # If we found a Luma URL, fetch additional details
    if luma_url:
        logging.info(f"Found Luma URL in Google Calendar event: {luma_url}")
        luma_details = get_luma_event_details(luma_url)
    
    # Get location from event
    event_location = event.get('location', '')
    
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
            import hashlib
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
            "source_url": luma_url if luma_url else event.get('htmlLink', ''),
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
            "luma_source": True if luma_url else False
        }
    }

def fetch_google_calendar_events(calendar_id: str, community_id: str) -> List[Dict]:
    """Fetch events using API key"""
    try:
        service = build('calendar', 'v3', developerKey=API_KEY)
        
        # Use timezone-aware datetime for start and end
        now = datetime.now(UTC)
        one_year_from_now = datetime(now.year + 1, now.month, now.day, tzinfo=UTC)
        
        events_result = service.events().list(
            calendarId=calendar_id,
            timeMin=now.isoformat(),
            timeMax=one_year_from_now.isoformat(),
            maxResults=200,  # Increased from 100 to 200
            singleEvents=True,
            orderBy='startTime'
        ).execute()
        
        events = events_result.get('items', [])
        
        if not events:
            return []
            
        return [format_google_event(event, community_id) for event in events]
        
    except Exception as e:
        print(f"Error fetching Google Calendar events: {e}")
        return []

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
            end_date = datetime.fromisoformat(end_date_str).replace(tzinfo=UTC)
            
        return end_date > datetime.now(UTC)
        
    except Exception as e:
        print(f"Error parsing date for event {event.get('id')}: {e}")
        return False  # Exclude events with invalid dates

def main():
    all_events = []
    
    # Fetch Google Calendar events
    print("Fetching Google Calendar events...")
    for calendar_name, config in GOOGLE_CALENDARS.items():
        print(f"Fetching events for {calendar_name}...")
        google_events = fetch_google_calendar_events(config["id"], config["community_id"])
        all_events.extend(google_events)
    
    # Filter out past events
    filtered_events = [event for event in all_events if is_future_event(event)]
    
    # Save filtered events to file
    output = {"events": filtered_events}
    output_file = 'data/google_calendar_events.json'
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"\nTotal future events collected: {len(filtered_events)}")
    print(f"Events saved to {output_file}")

if __name__ == '__main__':
    main() 