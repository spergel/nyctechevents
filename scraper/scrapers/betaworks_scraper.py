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
from urllib.parse import urljoin

# Setup paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TECH_DIR = os.path.dirname(os.path.dirname(os.path.dirname(SCRIPT_DIR)))
DATA_DIR = os.path.join(TECH_DIR, 'data')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
)

# Betaworks community ID
BETAWORKS_COMMUNITY_ID = "com_betaworks"
BETAWORKS_URL = "https://www.betaworks.com/events"

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

def parse_date_time(date_str: str, time_str: str = "") -> tuple:
    """Parse date and time strings into ISO format"""
    try:
        # Clean up the date string
        date_str = date_str.strip()
        
        # Handle various date formats
        date_formats = [
            "%A, %B %d, %Y %I:%M %p",  # Tuesday, July 1, 2025 6:00 pm
            "%A, %B %d, %Y",  # Tuesday, July 1, 2025
            "%B %d, %Y",      # July 1, 2025
            "%A, %B %d",      # Tuesday, July 1
            "%B %d",          # July 1
        ]
        
        parsed_date = None
        for fmt in date_formats:
            try:
                parsed_date = datetime.strptime(date_str, fmt)
                break
            except ValueError:
                continue
        
        if not parsed_date:
            logging.warning(f"Could not parse date: {date_str}")
            return None, None
        
        # If no year provided, assume current year
        if parsed_date.year == 1900:
            parsed_date = parsed_date.replace(year=datetime.now().year)
        
        # Parse time if provided and not already in the date string
        start_time = parsed_date
        end_time = parsed_date
        
        # If the date string already contains time, use it
        if ':' in date_str and ('am' in date_str.lower() or 'pm' in date_str.lower()):
            # Time is already parsed with the date
            start_time = parsed_date
            # Default end time to 2 hours later
            end_time = start_time.replace(hour=(start_time.hour + 2) % 24)
        elif time_str:
            time_str = time_str.strip().lower()
            # Handle various time formats
            time_match = re.search(r'(\d{1,2}):?(\d{2})?\s*(am|pm)', time_str)
            if time_match:
                hour = int(time_match.group(1))
                minute = int(time_match.group(2)) if time_match.group(2) else 0
                ampm = time_match.group(3)
                
                # Convert to 24-hour format
                if ampm == 'pm' and hour != 12:
                    hour += 12
                elif ampm == 'am' and hour == 12:
                    hour = 0
                
                start_time = parsed_date.replace(hour=hour, minute=minute)
                # Default end time to 2 hours later
                end_time = start_time.replace(hour=(start_time.hour + 2) % 24)
        
        # Make timezone-aware (Eastern Time)
        et = pytz.timezone('America/New_York')
        start_time = et.localize(start_time)
        end_time = et.localize(end_time)
        
        return start_time.isoformat(), end_time.isoformat()
        
    except Exception as e:
        logging.error(f"Error parsing date/time: {e}")
        return None, None

def extract_event_details(event_url: str) -> Optional[Dict]:
    """Extract detailed event information from individual event page"""
    try:
        logging.info(f"Fetching event details from: {event_url}")
        response = requests.get(event_url, headers=HEADERS, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Extract title
        title_elem = soup.find('h1', class_='event-title-heading')
        if not title_elem:
            title_elem = soup.find('h1')
        title = safe_extract_text(title_elem, "Untitled Event")
        
        # Extract description
        description = ""
        description_elem = soup.find('div', class_='w-richtext')
        if description_elem:
            # Get the text and clean it up
            description = safe_extract_text(description_elem)
            # Clean up encoding issues and extra whitespace
            description = re.sub(r'\s+', ' ', description)  # Replace multiple spaces with single space
            description = description.replace('ââ', '')  # Remove encoding artifacts
            description = description.strip()
        
        # Extract date and time
        date_str = ""
        time_str = ""
        
        # Look for date/time in the event details
        when_elem = soup.find('h4', string=lambda text: text and 'when' in text.lower())
        if when_elem:
            when_container = when_elem.find_parent()
            if when_container:
                text_blocks = when_container.find_all('div', class_='text-block')
                if len(text_blocks) >= 3:
                    date_str = f"{text_blocks[0].get_text(strip=True)}, {text_blocks[1].get_text(strip=True)} {text_blocks[2].get_text(strip=True)}"
                    if len(text_blocks) >= 4:
                        time_str = text_blocks[3].get_text(strip=True)
        
        start_dt, end_dt = parse_date_time(date_str, time_str)
        
        # Extract location
        location = "Betaworks • 29 Little West 12th Street, New York, NY 10014"
        location_elem = soup.find('h4', string=lambda text: text and 'location' in text.lower())
        if location_elem:
            location_container = location_elem.find_parent()
            if location_container:
                location_text = location_container.find('div', class_='text-block')
                if location_text:
                    location = safe_extract_text(location_text)
        
        # Extract image URL
        image_url = ""
        image_elem = soup.find('img', class_='image-6')
        if image_elem and 'src' in image_elem.attrs:
            image_url = image_elem['src']
        
        # Extract registration URL
        registration_url = ""
        luma_elem = soup.find('a', class_='luma-checkout--button')
        if luma_elem and 'href' in luma_elem.attrs:
            registration_url = luma_elem['href']
        
        # Determine event type based on title and description
        event_type = "Tech Event"
        text_content = f"{title} {description}".lower()
        
        if any(word in text_content for word in ['hackathon', 'hack']):
            event_type = "Hackathon"
        elif any(word in text_content for word in ['ai', 'artificial intelligence', 'machine learning']):
            event_type = "AI Event"
        elif any(word in text_content for word in ['demo', 'showcase']):
            event_type = "Demo Event"
        elif any(word in text_content for word in ['mixer', 'networking']):
            event_type = "Networking"
        elif any(word in text_content for word in ['workshop', 'class']):
            event_type = "Workshop"
        
        return {
            'title': title,
            'description': description,
            'start_date': start_dt,
            'end_date': end_dt,
            'location': location,
            'image_url': image_url,
            'registration_url': registration_url,
            'event_type': event_type,
            'url': event_url
        }
        
    except Exception as e:
        logging.error(f"Error extracting event details from {event_url}: {e}")
        return None

def scrape_betaworks_events() -> List[Dict]:
    """Scrape all events from Betaworks events page"""
    events = []
    
    try:
        logging.info(f"Fetching Betaworks events from {BETAWORKS_URL}")
        response = requests.get(BETAWORKS_URL, headers=HEADERS, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Find all event links in the feed grid
        event_links = soup.find_all('a', class_='feed-div')
        logging.info(f"Found {len(event_links)} event links")
        
        for link in event_links:
            try:
                # Extract basic info from the event card
                event_url = link.get('href')
                if not event_url:
                    continue
                
                # Make URL absolute if it's relative
                if not event_url.startswith('http'):
                    event_url = urljoin(BETAWORKS_URL, event_url)
                
                # Skip non-event links (like Vimeo, external sites, etc.)
                if not event_url.startswith('https://www.betaworks.com/event/'):
                    logging.info(f"Skipping non-event link: {event_url}")
                    continue
                
                # Extract title from the card
                title_elem = link.find('h3', class_='calendar-event-title')
                if not title_elem:
                    title_elem = link.find('h3')
                title = safe_extract_text(title_elem, "Untitled Event")
                
                # Skip events without proper titles
                if not title or title == "Untitled Event":
                    logging.info(f"Skipping event without proper title: {event_url}")
                    continue
                
                # Extract date from the card
                date_elem = link.find('div', string=re.compile(r'\w+, \w+ \d+, \d{4}'))
                date_str = safe_extract_text(date_elem, "")
                
                # Extract event type/label
                label_elem = link.find('h4', class_='label')
                event_label = safe_extract_text(label_elem, "")
                
                # Get detailed event information
                event_details = extract_event_details(event_url)
                
                if event_details:
                    # Use details from the event page, fallback to card info
                    event_title = event_details.get('title', title)
                    event_description = event_details.get('description', '')
                    start_date = event_details.get('start_date')
                    end_date = event_details.get('end_date')
                    location = event_details.get('location', 'Betaworks • 29 Little West 12th Street, New York, NY 10014')
                    image_url = event_details.get('image_url', '')
                    registration_url = event_details.get('registration_url', '')
                    event_type = event_details.get('event_type', 'Tech Event')
                    
                    # Generate event ID
                    event_id_str = f"{event_title}{start_date}{BETAWORKS_COMMUNITY_ID}"
                    event_id_hash = hashlib.md5(event_id_str.encode()).hexdigest()[:8]
                    event_id = f"evt_betaworks_{event_id_hash}"
                    
                    # Create event object
                    event = {
                        "id": event_id,
                        "name": event_title,
                        "type": event_type,
                        "locationId": "loc_betaworks",
                        "communityId": BETAWORKS_COMMUNITY_ID,
                        "description": event_description,
                        "startDate": start_date,
                        "endDate": end_date,
                        "category": ["Tech", "Innovation", "Startup"],
                        "price": {
                            "amount": 0,
                            "type": "Free",
                            "currency": "USD",
                            "details": "Most Betaworks events are free"
                        },
                        "capacity": 100,
                        "registrationRequired": True,
                        "tags": ["betaworks", "innovation", "tech"],
                        "image": "betaworks-event.jpg",
                        "status": "upcoming",
                        "metadata": {
                            "source_url": event_url,
                            "registration_url": registration_url,
                            "event_label": event_label,
                            "organizer": {
                                "name": "Betaworks",
                                "email": "hello@betaworks.com"
                            },
                            "venue": {
                                "name": "Betaworks",
                                "address": "29 Little West 12th Street, New York, NY 10014",
                                "type": "Tech Space"
                            },
                            "featured": False,
                            "image_url": image_url
                        }
                    }
                    
                    events.append(event)
                    logging.info(f"Processed event: {event_title}")
                
            except Exception as e:
                logging.error(f"Error processing event link: {e}")
                continue
        
        logging.info(f"Successfully processed {len(events)} Betaworks events")
        return events
        
    except Exception as e:
        logging.error(f"Error scraping Betaworks events: {e}")
        return []

def main():
    """Main function to scrape Betaworks events"""
    logging.info("Starting Betaworks events scraper")
    
    # Create data directory if it doesn't exist
    os.makedirs(DATA_DIR, exist_ok=True)
    
    # Scrape events
    events = scrape_betaworks_events()
    
    if events:
        # Save to file
        output_file = os.path.join(DATA_DIR, 'betaworks_events.json')
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump({"events": events}, f, indent=2, ensure_ascii=False)
            logging.info(f"Saved {len(events)} events to {output_file}")
            return output_file
        except Exception as e:
            logging.error(f"Failed to save events: {str(e)}")
            return None
    else:
        logging.warning("No events were scraped")
        return None

if __name__ == "__main__":
    main() 