import os
import json
import requests
import hashlib
import logging
import pytz
import re
from bs4 import BeautifulSoup
from typing import Dict, List, Optional
from datetime import datetime, timezone
from urllib.parse import urljoin

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
)

# Fabrik community ID
FABRIK_COMMUNITY_ID = "com_fabrik"  
# Fabrik gatherings URL
FABRIK_URL = "https://www.joinfabrik.com/gatherings"

# Browser headers to mimic a real browser request
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
}

def safe_extract_text(element, default="") -> str:
    """Safely extract text from a BS4 element"""
    if element is None:
        return default
    return element.get_text(strip=True)

def get_luma_event_details(event_url: str) -> Optional[Dict]:
    """Fetch detailed event information from Luma event page"""
    try:
        # Make sure we have a valid URL
        if not event_url or not isinstance(event_url, str):
            return {}
            
        # Ensure URL is a Luma URL
        if 'lu.ma' not in event_url:
            return {}
            
        logging.info(f"Fetching details from Luma event URL: {event_url}")
        response = requests.get(event_url, headers=HEADERS, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Extract event details
        details = {}
        
        # Get event title
        title_elem = soup.find('h1', {'class': 'title'})
        if title_elem:
            details['title'] = safe_extract_text(title_elem)
        
        # Get full description/about section
        about_section = soup.find('div', {'class': 'spark-content'})
        if about_section:
            details['full_description'] = safe_extract_text(about_section)
            
        # Get location info
        location_details = {
            'venue_name': '',
            'address': '',
            'type': 'Offline',
            'location_id': 'loc_fabrik'
        }
        
        location_div = soup.select_one('div:contains("Location")')
        if location_div:
            venue_elem = soup.select_one('div.venue-name')
            if venue_elem:
                location_details['venue_name'] = safe_extract_text(venue_elem)
                
            address_elem = soup.select_one('div.address')
            if address_elem:
                location_details['address'] = safe_extract_text(address_elem)
                
            # Check if this is an online event
            if 'online' in soup.text.lower() or 'virtual' in soup.text.lower():
                location_details['type'] = 'Online'
                
        details['location_details'] = location_details
            
        # Get event date and time
        date_elem = soup.select_one('div:contains("Date")')
        if date_elem:
            details['date_display'] = safe_extract_text(date_elem)
            
        # Get price information
        price_info = {
            'is_free': True,
            'price': 0,
            'currency': 'USD'
        }
        
        price_elem = soup.select_one('div:contains("Price")')
        if price_elem:
            price_text = safe_extract_text(price_elem)
            if 'Free' not in price_text and '$0' not in price_text:
                price_info['is_free'] = False
                # Extract price amount
                price_match = re.search(r'\$(\d+)', price_text)
                if price_match:
                    price_info['price'] = int(price_match.group(1))
                    
        details['price_info'] = price_info
            
        # Extract start and end times
        time_elem = soup.select_one('div:contains("Time")')
        if time_elem:
            time_text = safe_extract_text(time_elem)
            details['time_display'] = time_text
            
            # Try to parse date and time
            try:
                # Look for patterns like "March 3" and "6:30pm - 9:00pm"
                date_match = re.search(r'(\w+\s+\d+)', time_text)
                time_match = re.search(r'(\d+:\d+(?:am|pm))\s*-\s*(\d+:\d+(?:am|pm))', time_text, re.IGNORECASE)
                
                if date_match and time_match:
                    date_str = date_match.group(1)
                    start_time_str = time_match.group(1)
                    end_time_str = time_match.group(2)
                    
                    # Get current year
                    current_year = datetime.now().year
                    
                    # Parse start and end times
                    start_dt_str = f"{date_str} {current_year} {start_time_str}"
                    end_dt_str = f"{date_str} {current_year} {end_time_str}"
                    
                    # Parse with flexible format
                    start_dt = datetime.strptime(start_dt_str, "%B %d %Y %I:%M%p")
                    end_dt = datetime.strptime(end_dt_str, "%B %d %Y %I:%M%p")
                    
                    # Store as ISO format
                    details['start_time'] = start_dt.isoformat()
                    details['end_time'] = end_dt.isoformat()
            except Exception as e:
                logging.error(f"Error parsing date/time: {e}")
                
        return details
        
    except Exception as e:
        logging.error(f"Error fetching Luma event details: {e}")
        return {}

def get_fabrik_luma_events() -> List[Dict]:
    """Scrape Fabrik gatherings page for Luma event links and extract event details"""
    events = []
    
    try:
        logging.info(f"Fetching Fabrik gatherings from {FABRIK_URL}")
        response = requests.get(FABRIK_URL, headers=HEADERS, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Find all event containers based on the provided HTML structure
        event_containers = soup.select('div.sm\\:flex.gap-8')
        logging.info(f"Found {len(event_containers)} event containers")
        
        for container in event_containers:
            # Find the RSVP link which should contain the Luma URL
            luma_link = container.select_one('a[href*="lu.ma"]')
            
            if luma_link and 'href' in luma_link.attrs:
                luma_url = luma_link['href']
                logging.info(f"Found Luma URL: {luma_url}")
                
                # Extract basic info from the container
                event = {
                    'url': luma_url,
                    'summary': '',
                    'description': '',
                    'location': 'Fabrik New York',
                }
                
                # Get title
                title_elem = container.select_one('p.text-2xl, p.lg\\:text-\\[32px\\]')
                if title_elem:
                    event['summary'] = safe_extract_text(title_elem)
                
                # Get date
                date_elem = container.select_one('p.text-lg.uppercase')
                if date_elem:
                    event['date'] = safe_extract_text(date_elem)
                
                # Get time and host info
                info_elem = container.select_one('div.line-clamp-3')
                if info_elem:
                    event['description'] = safe_extract_text(info_elem)
                    
                    # Try to extract time information
                    time_match = re.search(r'Time:\s+(.*?)(?:<br>|\n|$)', safe_extract_text(info_elem))
                    if time_match:
                        event['time'] = time_match.group(1).strip()
                
                # Get detailed information from Luma
                event_details = get_luma_event_details(luma_url)
                if event_details:
                    event['additional_details'] = event_details
                    
                    # Use Luma title if available
                    if 'title' in event_details:
                        event['summary'] = event_details['title']
                    
                    # Use Luma description if available
                    if 'full_description' in event_details:
                        event['description'] = event_details['full_description']
                    
                    # Use Luma start/end times if available
                    if 'start_time' in event_details:
                        event['start'] = datetime.fromisoformat(event_details['start_time'])
                    if 'end_time' in event_details:
                        event['end'] = datetime.fromisoformat(event_details['end_time'])
                
                # If we couldn't get start/end from Luma, try to parse from the container
                if 'start' not in event and 'date' in event and 'time' in event:
                    try:
                        date_str = event['date']  # e.g., "March 3"
                        time_str = event['time']  # e.g., "6:30pm - 9:00pm EST"
                        
                        # Extract start and end times
                        time_match = re.search(r'(\d+:\d+(?:am|pm))\s*-\s*(\d+:\d+(?:am|pm))', time_str, re.IGNORECASE)
                        if time_match:
                            start_time = time_match.group(1)
                            end_time = time_match.group(2)
                            
                            # Get current year
                            current_year = datetime.now().year
                            
                            # Parse start and end times
                            start_dt_str = f"{date_str} {current_year} {start_time}"
                            end_dt_str = f"{date_str} {current_year} {end_time}"
                            
                            # Parse with flexible format
                            start_dt = datetime.strptime(start_dt_str, "%B %d %Y %I:%M%p")
                            end_dt = datetime.strptime(end_dt_str, "%B %d %Y %I:%M%p")
                            
                            event['start'] = start_dt
                            event['end'] = end_dt
                    except Exception as e:
                        logging.error(f"Error parsing date/time from container: {e}")
                
                events.append(event)
                
        return events
        
    except Exception as e:
        logging.error(f"Error fetching Fabrik events: {e}")
        return []

def parse_location(raw_location):
    """Parse location string into structured format"""
    venue = {
        'name': 'Fabrik New York',
        'address': raw_location if raw_location else 'New York',
        'type': 'Offline',
        'location_id': 'loc_fabrik'
    }
    
    # Check if it's an online event
    if raw_location and ('zoom' in raw_location.lower() or 'online' in raw_location.lower() or 'virtual' in raw_location.lower()):
        venue['type'] = 'Online'
        venue['name'] = 'Online Event'
        
    return venue

def clean_description(desc):
    """Clean up event description"""
    if not desc:
        return ""
        
    # Remove extra whitespace
    desc = re.sub(r'\s+', ' ', desc).strip()
    
    return desc

def extract_speakers(desc):
    """Extract speaker names from description"""
    speakers = []
    
    if not desc:
        return speakers
        
    # Look for "Hosted by" pattern
    hosted_match = re.search(r'Hosted by\s+([^<\n]+)', desc)
    if hosted_match:
        host = hosted_match.group(1).strip()
        speakers.append(host)
        
    return speakers

def convert_fabrik_event(event, community_id):
    """Convert Fabrik event to standardized format"""
    eastern = pytz.timezone('America/New_York')
    
    # Generate unique ID
    unique_id = f"{event['summary']}{event.get('url', '')}".encode()
    event_id = hashlib.md5(unique_id).hexdigest()[:8]
    
    # Handle datetime conversion
    start_date = event.get('start', datetime.now())
    end_date = event.get('end', start_date)
    
    # Try to convert to Eastern time
    try:
        if start_date.tzinfo is None:
            start_date = eastern.localize(start_date)
        else:
            start_date = start_date.astimezone(eastern)
            
        if end_date.tzinfo is None:
            end_date = eastern.localize(end_date)
        else:
            end_date = end_date.astimezone(eastern)
    except Exception as e:
        logging.error(f"Error converting timezone: {e}")
    
    # Get additional details
    additional_details = event.get('additional_details', {})
    
    # Parse location data
    raw_location = event.get('location', '')
    venue = parse_location(raw_location)
    
    # Update venue with detailed location if available
    if additional_details and 'location_details' in additional_details:
        loc_details = additional_details['location_details']
        venue.update({
            'name': loc_details.get('venue_name', venue['name']),
            'address': loc_details.get('address', venue['address']),
            'type': loc_details.get('type', venue['type']),
            'location_id': 'loc_fabrik'
        })
    
    # Extract price from additional details
    price_info = {
        'is_free': True,
        'amount': 0,
        'currency': 'USD'
    }
    
    if additional_details and 'price_info' in additional_details:
        price_details = additional_details['price_info']
        price_info.update({
            'is_free': price_details.get('is_free', True),
            'amount': price_details.get('price', 0),
            'currency': price_details.get('currency', 'USD')
        })
    
    # Clean description
    description = clean_description(event.get('description', ''))
    
    # Extract speakers
    speakers = extract_speakers(description)
    
    # Create standardized event object
    standardized_event = {
        'id': event_id,
        'title': event.get('summary', 'Fabrik Event'),
        'description': description,
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
        'venue': venue,
        'url': event.get('url', ''),
        'community_id': community_id,
        'price': price_info,
        'speakers': speakers,
        'tags': ['fabrik'],
        'source': 'fabrik'
    }
    
    return standardized_event

def is_future_event(event: Dict) -> bool:
    """Check if an event is in the future"""
    try:
        end_date_str = event.get('end_date')
        if not end_date_str:
            return False
            
        end_date = datetime.fromisoformat(end_date_str)
        now = datetime.now(end_date.tzinfo)
        
        return end_date > now
    except Exception as e:
        logging.error(f"Error checking if event is in future: {e}")
        return False

def main():
    """Main function to scrape Fabrik events and save to file"""
    print("Fetching Fabrik events...")
    
    # Get Fabrik events
    fabrik_events = get_fabrik_luma_events()
    print(f"Found {len(fabrik_events)} Fabrik events")
    
    # Convert events to standardized format
    converted_events = [convert_fabrik_event(event, FABRIK_COMMUNITY_ID) for event in fabrik_events]
    
    # Filter out past events
    filtered_events = [event for event in converted_events if is_future_event(event)]
    print(f"Filtered to {len(filtered_events)} future events")
    
    # Save filtered events to file
    output = {"events": filtered_events}
    output_file = 'data/fabrik_events.json'
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    # Prettify JSON output
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False, sort_keys=True)
    
    print(f"Events saved to {output_file}")
    
    # Also save to a location-specific file for easier integration
    loc_output_file = 'data/loc_fabrik_events.json'
    with open(loc_output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False, sort_keys=True)
    
    print(f"Events also saved to {loc_output_file}")

if __name__ == '__main__':
    main()
##DOESNT WORK