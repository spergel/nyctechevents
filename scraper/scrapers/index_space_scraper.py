import requests
from bs4 import BeautifulSoup
import json
import logging
import hashlib
import os
import re
from datetime import datetime, timezone
from dateutil import parser
from typing import Dict, List, Optional
import pytz

# Set up logging to console
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
)

# Setup paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TECH_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(TECH_DIR, 'data')

def safe_extract_text(element, default="") -> str:
    """Safely extract text from a BS4 element"""
    if element is None:
        return default
    return element.get_text(separator='\n').strip()

def fetch_events_list() -> List[str]:
    """Fetch all event URLs from the events page"""
    base_url = "https://www.index-space.org"
    events_url = f"{base_url}/collections/events"
    happenings_url = f"{base_url}/collections/happenings"
    products_url = f"{base_url}/products"
    
    event_links = []
    
    # Fetch events from both the events and happenings pages
    for url in [events_url, happenings_url]:
        try:
            logging.info(f"Fetching events from {url}")
            response = requests.get(url)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find all product links
            for link in soup.find_all('a', href=True):
                href = link['href']
                if '/products/' in href:
                    # Make sure it's an absolute URL
                    if href.startswith('/'):
                        full_url = f"{base_url}{href}"
                    else:
                        full_url = href
                    
                    if full_url not in event_links:
                        event_links.append(full_url)
                        logging.debug(f"Found event link: {full_url}")
            
            logging.info(f"Found {len(event_links)} event links from {url}")
        except Exception as e:
            logging.error(f"Failed to fetch events list from {url}: {str(e)}")
    
    # If we didn't find any links, add some sample URLs for testing
    if not event_links:
        logging.warning("No event links found. Adding sample URLs for testing.")
        event_links = [
            "https://www.index-space.org/products/how-to-make-more-money-a-practical-guide-for-freelancers-small-business-owners"
        ]
    
    return list(set(event_links))  # Remove duplicates

def parse_price(price_text: str) -> Dict:
    """Parse price information from text"""
    price_info = {
        "amount": 0,
        "type": "Free",
        "currency": "USD",
        "details": "Free"
    }
    
    if not price_text:
        return price_info
    
    # Try to extract price amount
    price_match = re.search(r'\$(\d+(\.\d+)?)', price_text)
    if price_match:
        price_info["amount"] = float(price_match.group(1))
        price_info["type"] = "Paid"
        price_info["details"] = price_text.strip()
    elif "free" in price_text.lower():
        price_info["type"] = "Free"
        price_info["details"] = "Free"
    
    return price_info

def parse_date_time(date_str: str, time_str: str = "") -> tuple:
    """Parse date and time strings into ISO format"""
    try:
        # Clean up the strings
        date_str = date_str.replace('&nbsp;', ' ').strip()
        time_str = time_str.replace('&nbsp;', ' ').strip() if time_str else ""

        logging.debug(f"Original parsing inputs - Date: '{date_str}', Time: '{time_str}'")

        # Handle date ranges in date_str by taking the first date
        if '—' in date_str:
            date_parts = date_str.split('—')
            date_str = date_parts[0].strip()
            logging.debug(f"Date range detected, using first date: '{date_str}'")

        # Remove day names (e.g., "Fridays ", "Tuesday ") from the start of time_str
        time_str = re.sub(r"^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)s?\s*from\s*", "", time_str, flags=re.IGNORECASE).strip()
        # Further clean common prefixes if "from" was not there
        time_str = re.sub(r"^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)s?\s*", "", time_str, flags=re.IGNORECASE).strip()
        logging.debug(f"Cleaned time string for parsing: '{time_str}'")
        
        logging.debug(f"Parsing date: '{date_str}' and time: '{time_str}'")
        
        # If we have both date and time
        if date_str and time_str:
            # Extract start and end times
            if '—' in time_str:
                time_parts = time_str.split('—')
                start_time = time_parts[0].strip()
                end_time = time_parts[1].strip()
                
                # Parse start datetime
                start_dt = parser.parse(f"{date_str} {start_time}")
                start_iso = start_dt.isoformat()
                
                # Parse end datetime
                end_dt = parser.parse(f"{date_str} {end_time}")
                end_iso = end_dt.isoformat()
            else:
                # If there's no end time, just parse the start time
                start_dt = parser.parse(f"{date_str} {time_str}")
                start_iso = start_dt.isoformat()
                
                # Set end time to 2 hours after start time as a default
                end_dt = start_dt.replace(hour=start_dt.hour + 2)
                end_iso = end_dt.isoformat()
        else:
            # Try to parse the date string directly
            start_dt = parser.parse(date_str)
            start_iso = start_dt.isoformat()
            
            # Set end time to 2 hours after start time as a default
            end_dt = start_dt.replace(hour=start_dt.hour + 2)
            end_iso = end_dt.isoformat()
        
        logging.debug(f"Parsed dates - Start: {start_iso}, End: {end_iso}")
        return start_iso, end_iso
    except Exception as e:
        logging.warning(f"Failed to parse date/time {date_str} {time_str}: {str(e)}")
        return None, None

def is_future_event(start_date_str: str) -> bool:
    """Check if an event is in the future."""
    try:
        start_date = datetime.fromisoformat(start_date_str)
        now = datetime.now()
        
        # Make both datetimes timezone-naive for comparison
        if start_date.tzinfo is not None:
            start_date = start_date.replace(tzinfo=None)
            
        return start_date > now
    except Exception as e:
        logging.error(f"Error checking if event is in the future: {e}")
        # If we can't determine, assume it's a future event
        return True

def fetch_event_details(url: str) -> Optional[Dict]:
    """Fetch and parse details for a single event"""
    try:
        logging.info(f"Fetching details for event at {url}")
        response = requests.get(url)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Generate consistent ID
        event_id = hashlib.md5(url.encode()).hexdigest()[:8]
        
        # Extract title
        title_element = soup.find('h1', class_=lambda c: c and 'ProductInfo__title' in c)
        if not title_element:
            title_element = soup.find('h1')
        
        title = safe_extract_text(title_element, "Untitled Event")
        logging.debug(f"Extracted title: {title}")
        
        # Extract price
        price_element = soup.find('span', class_=lambda c: c and 'ProductInfo__price' in c)
        price_text = safe_extract_text(price_element, "$0")
        logging.debug(f"Extracted price: {price_text}")
        price_info = parse_price(price_text)
        
        # Extract date and time
        date_div = soup.find('div', class_=lambda c: c and 'ProductDate' in c)
        date_str = ""
        time_str = ""
        
        if date_div:
            date_paragraphs = date_div.find_all('p')
            if len(date_paragraphs) >= 1:
                date_str = safe_extract_text(date_paragraphs[0])
                logging.debug(f"Extracted date: {date_str}")
            
            if len(date_paragraphs) >= 2:
                time_str = safe_extract_text(date_paragraphs[1])
                logging.debug(f"Extracted time: {time_str}")
        
        start_dt, end_dt = parse_date_time(date_str, time_str)
        
        # Skip past events
        if start_dt and not is_future_event(start_dt):
            logging.info(f"Skipping past event: {title}")
            return None
        
        # Extract location
        location_text = "Index NYC"
        location_div = soup.find('div', class_=lambda c: c and 'ProductInfo__text-fields' in c)
        if location_div:
            location_text = safe_extract_text(location_div)
            logging.debug(f"Extracted location: {location_text}")
        
        # Extract description
        description = ""
        description_div = soup.find('div', id='Description')
        if description_div:
            description_content = description_div.find('div', class_=lambda c: c and 'Markdown' in c)
            if description_content:
                description = safe_extract_text(description_content)
                logging.debug(f"Extracted description: {description[:100]}...")
        
        # Extract facilitator/instructor
        facilitator_name = ""
        facilitator_div = soup.find('span', class_=lambda c: c and 'ProductInstructor__name' in c)
        if facilitator_div:
            facilitator_name = safe_extract_text(facilitator_div)
            logging.debug(f"Extracted facilitator: {facilitator_name}")
        
        # Extract registration link
        registration_link = ""
        register_button = soup.find('a', class_=lambda c: c and 'AddToCartContainer__button' in c)
        if register_button and 'href' in register_button.attrs:
            registration_link = register_button['href']
            logging.debug(f"Extracted registration link: {registration_link}")
        
        # Extract image URL
        image_url = ""
        image_element = soup.find('img', class_=lambda c: c and 'object-fit' in c)
        if image_element and 'src' in image_element.attrs:
            image_url = image_element['src']
            logging.debug(f"Extracted image URL: {image_url}")
        
        # Extract tags/categories
        tags = ["index-space"]
        if "IRL" in location_text:
            tags.append("in-person")
        elif "Virtual" in location_text or "Online" in location_text:
            tags.append("virtual")
        
        # Extract event type
        event_type = "Event"
        if "workshop" in title.lower() or "workshop" in description.lower():
            event_type = "Workshop"
            tags.append("workshop")
        elif "course" in title.lower() or "course" in description.lower():
            event_type = "Course"
            tags.append("course")
        
        # Build event object
        event = {
            "id": f"evt_index_{event_id}",
            "name": title,
            "type": event_type,
            "locationId": "loc_index",
            "communityId": "com_index",
            "description": description,
            "startDate": start_dt,
            "endDate": end_dt,
            "category": ["Arts", "Culture", "Community"],
            "price": price_info,
            "capacity": 50,  # Default capacity
            "registrationRequired": True,
            "tags": tags,
            "image": "index-space.jpg",
            "status": "upcoming",
            "metadata": {
                "source_url": url,
                "registration_url": registration_link,
                "organizer": {
                    "name": facilitator_name if facilitator_name else "Index Space",
                    "email": "info@index-space.org"
                },
                "venue": {
                    "name": "Index Space",
                    "address": "120 Walker St, Manhattan, NY 10013",
                    "type": "Offline" if "IRL" in location_text else "Online"
                },
                "featured": False,
                "image_url": image_url
            }
        }
        
        logging.info(f"Successfully processed event: {title}")
        return event
    except Exception as e:
        logging.error(f"Failed to fetch event details for {url}: {str(e)}")
        return None

def main():
    all_events = []
    
    # Create data directory if it doesn't exist
    os.makedirs(DATA_DIR, exist_ok=True)
    
    # Fetch all event URLs
    event_urls = fetch_events_list()
    logging.info(f"Found {len(event_urls)} event URLs to process")
    
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
            output_file = os.path.join(DATA_DIR, 'index_space_events.json')
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump({"events": all_events}, f, indent=2, ensure_ascii=False)
            logging.info(f"Saved {len(all_events)} events to {output_file}")
            return output_file
        except Exception as e:
            logging.error(f"Failed to save events: {str(e)}")
    else:
        logging.warning("No events were fetched")
    
    return None

if __name__ == "__main__":
    main() 