import requests
from bs4 import BeautifulSoup
import json
import logging
from datetime import datetime
import hashlib
import os
import re
from dateutil import parser
from typing import Dict, List, Optional

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
)

def safe_extract_text(element, default="") -> str:
    """Safely extract text from a BS4 element"""
    if element is None:
        return default
    return element.get_text(separator='\n').strip()

def fetch_events_list() -> List[str]:
    """Fetch all event URLs from the events page"""
    base_url = "https://interferencearchive.org/what-we-do/events/"
    try:
        response = requests.get(base_url)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Find all event links
        event_links = []
        for link in soup.find_all('a', href=True):
            if '/event/' in link['href']:
                event_links.append(link['href'])
        
        logging.info(f"Found {len(event_links)} event links")
        return list(set(event_links))  # Remove duplicates
    except Exception as e:
        logging.error(f"Failed to fetch events list: {str(e)}")
        return []

def safe_parse_date_time(date_str: str, time_str: str) -> tuple:
    """Safely parse date and time strings into ISO format"""
    try:
        # Remove any HTML entities and clean up the strings
        date_str = date_str.replace('&nbsp;', ' ').strip()
        time_str = time_str.replace('&nbsp;', ' ').strip()
        
        # Split time into start and end
        time_parts = time_str.split('to')
        
        # Parse start time
        start_dt = parser.parse(f"{date_str} {time_parts[0].strip()}")
        start_iso = start_dt.isoformat()
        
        # Parse end time if available
        end_iso = None
        if len(time_parts) > 1:
            end_dt = parser.parse(f"{date_str} {time_parts[1].strip()}")
            end_iso = end_dt.isoformat()
        
        return start_iso, end_iso
    except Exception as e:
        logging.warning(f"Failed to parse date/time {date_str} {time_str}: {str(e)}")
        return None, None

def fetch_event_details(url: str) -> Optional[Dict]:
    """Fetch and parse details for a single event"""
    try:
        response = requests.get(url)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Generate consistent ID
        event_id = hashlib.md5(url.encode()).hexdigest()[:8]
        
        # Extract title (required field)
        title = safe_extract_text(soup.find('h1', class_='post-title'))
        if not title:
            logging.warning(f"No title found for event {url}")
            title = "Untitled Event"
        
        # Initialize with default values
        start_dt = None
        end_dt = None
        description_text = ""
        
        # Try to extract date and time
        date_time = soup.find('div', class_='left-vr')
        if date_time:
            try:
                date_paras = date_time.find_all('p', class_='text-monospace')
                if len(date_paras) >= 2:
                    date_str = date_paras[0].text.strip()
                    time_str = date_paras[1].text.strip()
                    start_dt, end_dt = safe_parse_date_time(date_str, time_str)
            except Exception as e:
                logging.warning(f"Error parsing date/time: {str(e)}")
        
        # Try to extract description
        description = soup.find('div', class_='page-body-text')
        if description:
            description_text = safe_extract_text(description)
        
        # Build event object with required fields
        event = {
            "id": f"evt_interference_{event_id}",
            "name": title,
            "type": "Community",
            "locationId": "loc_interference",
            "communityId": "com_interference",
            "description": description_text,
            "startDate": start_dt,
            "endDate": end_dt,
            "category": ["Community", "Arts", "Activism"],
            "price": {
                "amount": 0,
                "type": "Free",
                "currency": "USD",
                "details": "Status Unknown"
            },
            "capacity": None,
            "registrationRequired": False,
            "tags": [],
            "image": "interference-archive.jpg",
            "status": "upcoming",
            "metadata": {
                "source_url": url,
                "organizer": {
                    "name": "Interference Archive",
                    "email": "info@interferencearchive.org"
                },
                "venue": {
                    "name": "Interference Archive",
                    "address": "314 7th St, Brooklyn, NY 11215",
                    "type": "Offline"
                },
                "featured": False
            }
        }
        
        # Try to extract tags from description
        if description_text:
            potential_tags = ["workshop", "exhibition", "panel", "discussion", "screening", "talk"]
            event["tags"] = [tag for tag in potential_tags if tag.lower() in description_text.lower()]
        
        return event
    except Exception as e:
        logging.error(f"Failed to fetch event details for {url}: {str(e)}")
        return None

def main():
    all_events = []
    
    # Create data directory if it doesn't exist
    os.makedirs('scripts/scrapers/data', exist_ok=True)
    
    # Fetch all event URLs
    event_urls = fetch_events_list()
    
    # Fetch details for each event
    for url in event_urls:
        try:
            event = fetch_event_details(url)
            if event:
                all_events.append(event)
                logging.info(f"Processed event: {event['name']}")
        except Exception as e:
            logging.error(f"Failed to process event {url}: {str(e)}")
            continue
    
    # Save events even if some failed
    if all_events:
        try:
            output_file = './data/interference_events.json'
            with open(output_file, 'w') as f:
                json.dump({"events": all_events}, f, indent=2)
            logging.info(f"Saved {len(all_events)} events to {output_file}")
        except Exception as e:
            logging.error(f"Failed to save events: {str(e)}")
    else:
        logging.warning("No events were fetched")

if __name__ == "__main__":
    main() 