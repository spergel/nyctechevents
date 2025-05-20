import json
import re
from datetime import datetime
import pytz
from bs4 import BeautifulSoup
import requests
import hashlib
import logging
import os

# Setup paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TECH_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(TECH_DIR, 'data')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
)

def generate_event_id(title):
    return f"evt_pioneer_{hashlib.md5(title.encode()).hexdigest()[:8]}"

def parse_datetime(date_str, time_str):
    try:
        et = pytz.timezone('America/New_York')
        # Handle both 7pm and 7:30pm formats
        time_format = "%Y-%m-%d %I:%M%p" if ":" in time_str else "%Y-%m-%d %I%p"
        dt = datetime.strptime(f"{date_str} {time_str}".upper(), time_format)
        return et.localize(dt).astimezone(pytz.utc).isoformat()
    except Exception as e:
        logging.error(f"Error parsing datetime: {e}")
        return None

def scrape_event_page(url):
    response = requests.get(url)
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Extract JSON-LD data
    script_data = soup.find('script', {'type': 'application/ld+json'})
    event_data = json.loads(script_data.string) if script_data else {}
    
    # Extract door times
    door_times = {}
    time_div = soup.select_one('.door-time')
    if time_div:
        for time_entry in time_div.select('.time'):
            text = time_entry.get_text(strip=True)
            time_match = re.search(r'(\d+:\d+[ap]m|\d+[ap]m)', text)
            if time_match:
                if 'Doors:' in text:
                    door_times['doors'] = time_match.group(1).lower()
                elif 'Start:' in text:
                    door_times['start'] = time_match.group(1).lower()
    
    # Extract description from meta
    description = soup.find('meta', {'name': 'description'})['content'] if soup.find('meta', {'name': 'description'}) else ''
    
    return event_data, door_times, description

def transform_event(event_data, door_times, description, event_url):
    # Date handling
    start_date = event_data.get('startDate', '')
    end_date = event_data.get('endDate', '')
    
    # Time handling from door times
    start_time = door_times.get('start', door_times.get('doors', '7pm'))  # Fallback to doors time
    start_datetime = parse_datetime(start_date, start_time) if start_date else None
    end_datetime = parse_datetime(end_date, '11pm') if end_date else None  # Default end time
    
    # Location from schema
    location = event_data.get('location', {})
    address = location.get('address', {}) if isinstance(location, dict) else {}
    
    return {
        "id": generate_event_id(event_data.get('name', '')),
        "name": event_data.get('name', ""),
        "type": "Cultural Event",
        "locationId": "loc_pioneer_works",
        "communityId": "com_pioneer_works",
        "description": description,
        "startDate": start_datetime,
        "endDate": end_datetime,
        "category": ["Arts", "Music", "Science"],
        "price": None,  # Price not visible in provided HTML
        "registrationRequired": True,
        "tags": [],
        "image": event_data.get('image', ''),
        "status": "upcoming",
        "metadata": {
            "source_url": event_url,
            "organizer": {
                "name": "Pioneer Works",
                "instagram": "@pioneerworks",
                "email": "info@pioneerworks.org"
            },
            "venue": {
                "name": location.get('name', 'Pioneer Works'),
                "address": address.get('streetAddress', '159 Pioneer Street'),
                "type": "Cultural Institution"
            },
            "featured": False
        }
    }

def main():
    base_url = "https://pioneerworks.org"
    calendar_url = f"{base_url}/calendar"
    
    # Create data directory if it doesn't exist
    os.makedirs(DATA_DIR, exist_ok=True)
    
    # Get calendar page
    response = requests.get(calendar_url)
    soup = BeautifulSoup(response.text, 'html.parser')
    
    events = []
    
    # Process each event card
    for card in soup.select('.program-main-card.single'):
        date_str = card.select_one('h1.h2').get_text(strip=True)
        event_link = card.select_one('a[href^="/programs/"]')['href']
        event_url = f"{base_url}{event_link}"
        
        # Scrape individual event page
        event_data, door_times, description = scrape_event_page(event_url)
        
        # Transform data
        transformed = transform_event(event_data, door_times, description, event_url)
        events.append(transformed)
    
    # Save output
    output_file = os.path.join(DATA_DIR, 'pioneer_works_events.json')
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump({"events": events}, f, indent=2, ensure_ascii=False)
        logging.info(f"Saved {len(events)} events to {output_file}")
        return output_file
    except Exception as e:
        logging.error(f"Failed to save events: {str(e)}")
        return None

if __name__ == "__main__":
    main() 