import os
import json
import requests
import hashlib
import logging
import pytz
import re
from bs4 import BeautifulSoup
from typing import Dict, List, Optional
from datetime import datetime, UTC
from icalendar import Calendar

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.FileHandler('scraper.log'), logging.StreamHandler()]
)

# Load communities data
with open('../../data/communities.json', 'r') as f:
    COMMUNITIES = {community['id']: community for community in json.load(f)['communities']}

# ICS Calendar Sources
ICS_CALENDARS = {
    "nyc_gatherings": {
        "id": "http://api.lu.ma/ics/get?entity=calendar&id=cal-cnuVqBPxDjDZGcF",
        "community_id": "com_nyc_gatherings"
    },
    "max_ny": {
        "id": "http://api.lu.ma/ics/get?entity=calendar&id=cal-KGV5WJNQjhqXGj5",
        "community_id": "com_max_ny"
    },
    "otwc": {
        "id": "http://api.lu.ma/ics/get?entity=calendar&id=cal-q37ZsEGpns4eio2",
        "community_id": "com_otwc"
    },
    "der_project": {
        "id": "http://api.lu.ma/ics/get?entity=calendar&id=cal-jnmufRkbO6lEBQH",
        "community_id": "com_der_project"
    },
    "olios": {
        "id": "http://api.lu.ma/ics/get?entity=calendar&id=cal-zfvU7AwJN56Zedx",
        "community_id": "com_olios"
    },
    "walk_club": {
        "id": "http://api.lu.ma/ics/get?entity=calendar&id=cal-nIXe5Toh3KsgZWg",
        "community_id": "com_walk_club"
    },
    "ny_hardware": {
        "id": "http://api.lu.ma/ics/get?entity=calendar&id=cal-vR9KDer3a9iEfUd",
        "community_id": "com_ny_hardware"
    },
    "la_creme_stem": {
        "id": "http://api.lu.ma/ics/get?entity=calendar&id=cal-4oDH9h513BBRk6y",
        "community_id": "com_la_creme_stem"
    },
    "luma_nyc": {
        "id": "http://api.lu.ma/ics/get?entity=calendar&id=cal-KGV5WJNQjhqXGj5",
        "community_id": "com_luma_nyc"
    },
    "third_place_nyc": {
        "id": "http://api.lu.ma/ics/get?entity=calendar&id=cal-AIpaP0cRGKS7tcw",
        "community_id": "com_third_place_nyc"
    },
    "reforester": {
        "id": "http://api.lu.ma/ics/get?entity=calendar&id=cal-p6wrlIz7NXddCxz",
        "community_id": "com_reforester"
    },
    "genZtea": {
        "id": "http://api.lu.ma/ics/get?entity=calendar&id=cal-6kEfZKtXphCXCQD",
        "community_id": "com_genZtea"
    }
}

def get_luma_event_details(event_url: str) -> Optional[Dict]:
    """Fetch detailed event information from Luma event page"""
    try:
        response = requests.get(event_url)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Extract event details
        details = {}
        
        # Get full description/about section
        about_section = soup.find('div', {'class': 'spark-content'})
        if about_section:
            details['full_description'] = about_section.get_text(strip=True)
            
        # Get actual capacity/attendee count
        attendees_div = soup.find('div', {'class': 'guests-string'})
        if attendees_div:
            attendee_text = attendees_div.get_text(strip=True)
            # Extract number from text like "212 Going"
            match = re.search(r'(\d+)\s+Going', attendee_text)
            if match:
                details['actual_capacity'] = int(match.group(1))
                
        # Get detailed location info
        location_div = soup.find('div', {'class': 'location'})
        if location_div:
            location_details = {
                'venue_name': '',
                'address': '',
                'room': '',
                'additional_info': ''
            }
            
            # Parse location components
            venue_name = location_div.find('div', {'class': 'fw-medium'})
            if venue_name:
                location_details['venue_name'] = venue_name.get_text(strip=True)
                
            address = location_div.find('div', {'class': 'text-tinted'})
            if address:
                location_details['address'] = address.get_text(strip=True)
                
            room = location_div.find('div', {'class': 'break-word'})
            if room:
                location_details['room'] = room.get_text(strip=True)
                
            details['location_details'] = location_details
            
        # Get speaker details
        speakers = []
        speaker_divs = soup.find_all('div', {'class': 'host-row'})
        for speaker in speaker_divs:
            speaker_name = speaker.find('div', {'class': 'fw-medium'})
            if speaker_name:
                speakers.append({
                    'name': speaker_name.get_text(strip=True),
                    'title': '',  # Could parse from description if available
                    'bio': ''    # Could parse from description if available
                })
        details['speakers'] = speakers
        
        # Get social media links
        social_links = []
        social_div = soup.find('div', {'class': 'social-links'})
        if social_div:
            links = social_div.find_all('a')
            for link in links:
                href = link.get('href')
                if href:
                    social_links.append(href)
        details['social_links'] = social_links
        
        return details
        
    except Exception as e:
        logging.error(f"Error fetching Luma event details: {e}")
        return None

def get_luma_events(ics_url):
    """Fetch and parse Luma calendar events from ICS feed"""
    response = requests.get(ics_url)
    response.raise_for_status()
    
    cal = Calendar.from_ical(response.text)
    events = []
    now = datetime.now(pytz.utc)
    
    for component in cal.walk():
        if component.name == "VEVENT":
            start = component.get('dtstart').dt
            end = component.get('dtend').dt
            
            # Skip past events (end time in past)
            if end < now:
                continue
                
            event_url = component.get('url', '')
            event_details = get_luma_event_details(event_url) if event_url else None
                
            events.append({
                "uid": component.get("uid"),
                "summary": component.get("summary"),
                "start": start,
                "end": end,
                "location": component.get("location"),
                "description": component.get("description"),
                "organizer": component.get("organizer"),
                "geo": component.get("geo"),
                "url": event_url,
                "additional_details": event_details
            })
    
    logging.info(f"Found {len(events)} upcoming events")
    return events

def parse_location(raw_location):
    """Extract structured location data from ICS location field"""
    if not raw_location:
        return {
            "name": "",
            "address": "",
            "type": "Online"
        }
    
    # Handle URL-based locations
    if raw_location.startswith('http'):
        return {
            "name": "Online Event",
            "address": raw_location,
            "type": "Online"
        }
    
    # Split address lines
    parts = [p.strip() for p in raw_location.split('\n') if p.strip()]
    
    # Special handling for common patterns
    if len(parts) == 1:
        # If it's just one line, treat it as both name and address
        return {
            "name": parts[0],
            "address": parts[0],
            "type": "Offline"
        }
    
    # Try to intelligently determine venue name vs address
    # Look for common address patterns in the first line
    first_line = parts[0].lower()
    if (any(first_line.startswith(str(i)) for i in range(10)) or  # Starts with number
        '@' in first_line or  # Contains @ symbol
        any(word in first_line for word in ['street', 'st.', 'avenue', 'ave.', 'road', 'rd.', 'boulevard', 'blvd.'])):
        # First line looks like an address, try to find a venue name in subsequent lines
        address = parts[0]
        name = parts[1] if len(parts) > 1 else parts[0]
    else:
        # First line is probably the venue name
        name = parts[0]
        address = '\n'.join(parts[1:]) if len(parts) > 1 else parts[0]
    
    return {
        "name": name,
        "address": address,
        "type": "Offline"
    }

def clean_description(desc):
    """Remove redundant boilerplate from descriptions"""
    return desc.replace("Find more information on https://lu.ma/nyc-tech", "").strip()

def parse_price(desc):
    """Extract price info from description"""
    if "free" in desc.lower():
        return {
            "amount": 0,
            "type": "Free",
            "currency": "USD",
            "details": "Status Unknown"
        }
    
    # Add more price parsing logic as needed
    return {
        "amount": 0,
        "type": "Free", 
        "currency": "USD",
        "details": ""
    }

def extract_speakers(desc):
    """Extract speaker names from description"""
    if "Hosted by" in desc:
        return [s.strip() for s in desc.split("Hosted by")[-1].split("\n")[0].split("&")]
    return []

def convert_ics_event(ics_event, community_id):
    """Convert ICS event to our standardized format with improved parsing"""
    eastern = pytz.timezone('America/New_York')
    
    # Generate unique ID
    unique_id = f"{ics_event['summary']}{ics_event['start']}".encode()
    event_id = hashlib.md5(unique_id).hexdigest()[:8]
    
    # Handle datetime conversion
    start_date = ics_event['start'].astimezone(eastern)
    end_date = ics_event['end'].astimezone(eastern)
    
    # Get additional details
    additional_details = ics_event.get('additional_details', {})
    
    # Parse location data
    raw_location = ics_event.get('location', '')
    venue = parse_location(raw_location)
    
    # Update venue with detailed location if available
    if additional_details and 'location_details' in additional_details:
        loc_details = additional_details['location_details']
        venue.update({
            'name': loc_details.get('venue_name', venue['name']),
            'address': loc_details.get('address', venue['address']),
            'room': loc_details.get('room', ''),
            'additional_info': loc_details.get('additional_info', '')
        })
    
    # Extract price from description
    price_info = parse_price(ics_event.get('description', ''))
    
    # Clean description
    description = clean_description(ics_event.get('description', ''))
    
    # Use full description if available
    if additional_details and 'full_description' in additional_details:
        description = additional_details['full_description']
    
    # Get actual capacity if available
    capacity = additional_details.get('actual_capacity', 100) if additional_details else 100
    
    return {
        "id": f"evt_{community_id}_{event_id}",
        "name": ics_event['summary'],
        "type": "Tech",
        "locationId": "loc_tbd",
        "communityId": community_id,
        "description": description,
        "startDate": start_date.isoformat(),
        "endDate": end_date.isoformat(),
        "category": ["Tech"],
        "price": price_info,
        "capacity": capacity,
        "registrationRequired": True,
        "tags": [],
        "image": "fractal-community.jpg",
        "status": "upcoming",
        "metadata": {
            "source_url": ics_event.get('url'),
            "speakers": additional_details.get('speakers', []) if additional_details else extract_speakers(description),
            "venue": venue,
            "featured": False,
            "social_links": additional_details.get('social_links', []) if additional_details else []
        }
    }

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
    
    # Fetch ICS Calendar events
    print("Fetching ICS Calendar events...")
    for calendar_name, config in ICS_CALENDARS.items():
        print(f"Fetching events for {calendar_name}...")
        try:
            ics_events = get_luma_events(config["id"])
            converted_events = [convert_ics_event(event, config["community_id"]) for event in ics_events]
            all_events.extend(converted_events)
        except Exception as e:
            print(f"Error fetching ICS events for {calendar_name}: {e}")
    
    # Filter out past events
    filtered_events = [event for event in all_events if is_future_event(event)]
    
    # Save filtered events to file
    output = {"events": filtered_events}
    output_file = 'data/ics_calendar_events.json'
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"\nTotal future events collected: {len(filtered_events)}")
    print(f"Events saved to {output_file}")

if __name__ == '__main__':
    main() 