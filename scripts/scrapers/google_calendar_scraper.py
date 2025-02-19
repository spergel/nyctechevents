import os
import json
from typing import Dict, List
from googleapiclient.discovery import build
from datetime import datetime, UTC


# Load locations data
def load_locations() -> Dict:
    try:
        with open('../../data/locations.json', 'r', encoding='utf-8') as f:
            return {loc['id']: loc for loc in json.load(f).get('locations', [])}
    except Exception as e:
        print(f"Error loading locations: {e}")
        return {}

# Load communities data
def load_communities() -> Dict:
    try:
        with open('../../data/communities.json', 'r', encoding='utf-8') as f:
            return {com['id']: com for com in json.load(f).get('communities', [])}
    except Exception as e:
        print(f"Error loading communities: {e}")
        return {}

# Google Calendar Sources
GOOGLE_CALENDARS = {
    "shop": {
        "id": "c_714ebf50b82d53ce38c86b95bc756c94cc7eacc6d4564ee46e27c99db8884728@group.calendar.google.com",
        "community_id": "com_principles"
    },
    "woodbine": {
        "id": "9c5aaff9d94fab9457557c6ed81534ff828c51de7a76c0c06d15878dee0e42ec@group.calendar.google.com",
        "community_id": "com_woodbine",
    },
    "explorers_club": {
        "id": "crk94q56n8o7fkj12h8880valiieinss@import.calendar.google.com",
        "community_id": "com_explorers_club"
    },
    "effective_altruism_nyc": {
        "id": "hbvetqf5h1pd0of0vn6uvphqts@group.calendar.google.com",
        "community_id": "com_effective_altruism_nyc"
    },
    "empire_skate": {
        "id": "i446n1u4c38ptol8a1v96foqug@group.calendar.google.com",
        "community_id": "com_empire_skate"
    },
    "climate_cafe": {
        "id": "1290diunt6bv9u92h532r0g9ro4j8g0s@import.calendar.google.com",
        "community_id": "com_climate_cafe"
    },
    "reading_rhythms_manhattan": {
        "id": "ilotg4jh39u6ie4fhifbsi2i0nkse67@import.calendar.google.com",
        "community_id": "com_reading_rhythms"
    },
    "nyc_backgammon": {
        "id": "iidj8joom64a6vm36cd6nqce55i0lko5@import.calendar.google.com",
        "community_id": "com_nyc_backgammon"
    },
    "south_park_commons": {
        "id": "bfptu3ajdae5cc2k16cvs1amenbft762@import.calendar.google.com",
        "community_id": "com_south_park_commons"
    },
    "verci": {
        "id": "pf6o7drlfrbhmpqlmlt7p215e70i9cjn@import.calendar.google.com",
        "community_id": "com_verci"
    }
}

API_KEY = "AIzaSyDeuWJ8-vsa4R7i0MKtx4Ojxqhf3Ud9Igs"

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

def format_google_event(event: Dict, community_id: str) -> Dict:
    """Format a Google Calendar event into our standard event format."""
    start = event.get('start', {}).get('dateTime', event.get('start', {}).get('date'))
    end = event.get('end', {}).get('dateTime', event.get('end', {}).get('date'))
    
    event_id = f"evt_{community_id}_{event['id'][:8]}"
    
    # Get location from event
    event_location = event.get('location', '')
    
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
        
    # Determine if registration is required based on event data
    description = event.get('description', '')
    registration_required = any(keyword in description.lower() 
                              for keyword in ['register', 'rsvp', 'ticket', 'sign up'])
    
    # Extract price information from description if available
    price_info = {
        "amount": 0,
        "type": "Free",
        "currency": "USD",
        "details": ""
    }
    
    # Look for price information in description
    if '$' in description:
        price_info["type"] = "Paid"
        price_info["details"] = "See event description for pricing details"
    
    return {
        "id": event_id,
        "name": event.get('summary', ''),
        "type": "",
        "locationId": location_id,
        "communityId": community_id,
        "description": description,
        "startDate": start,
        "endDate": end,
        "category": "",
        "price": price_info,
        "capacity": None,
        "registrationRequired": registration_required,
        "tags": "",
        "image": "",
        "status": "upcoming",
        "metadata": {
            "source_url": event.get('htmlLink', ''),
            "organizer": {
                "name":  event.get('organizer', {}).get('displayName', ''),
                "instagram": "",
                "email": event.get('organizer', {}).get('email', '')
            },
            "venue": {
                "name": venue_name,
                "address": venue_address,
                "type": venue_type
            },
            "featured": False
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