import json
import hashlib
import re
from datetime import datetime
from bs4 import BeautifulSoup
import requests
import pytz
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def generate_event_id(title, date_str):
    combined = f"{title}_{date_str}"
    return f"evt_gather_{hashlib.md5(combined.encode()).hexdigest()[:8]}"

def parse_gather_datetime(date_str):
    try:
        # Sample input: "02/28/ Fri | 7-9 PM EST | $85"
        if not date_str or "TBD" in date_str:
            logger.warning("No valid date provided")
            return None
            
        et = pytz.timezone('America/New_York')
        
        # Extract date portion using more precise pattern
        date_match = re.search(r'(\d{1,2}/\d{1,2})/\s*\w+\s*\|', date_str)
        if not date_match:
            logger.warning(f"Could not parse date from string: {date_str}")
            return None
            
        month_day = date_match.group(1)
        year = 2025  # Assuming current year
        time_match = re.search(r'\| (\d+-\d+ [AP]M) ', date_str)
        time_portion = "12:00 AM"  # Default if time not found
        
        if time_match:
            time_portion = time_match.group(1).replace(' ', '')
            
        # Parse combined datetime
        dt = datetime.strptime(f"{month_day}/{year} {time_portion}", "%m/%d/%Y %I-%M%p")
        return et.localize(dt).isoformat()
        
    except Exception as e:
        logger.error(f"Datetime parsing error: {str(e)}", exc_info=True)
        return None

def scrape_call_to_gather():
    base_url = "https://calltogather.com"
    events_url = f"{base_url}/gatherings"
    
    try:
        logger.info(f"Scraping events from {events_url}")
        response = requests.get(events_url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }, timeout=10)
        response.raise_for_status()
    except Exception as e:
        logger.error(f"Failed to fetch main page: {str(e)}")
        return {"events": []}

    soup = BeautifulSoup(response.text, 'html.parser')
    events = []
    
    event_cards = soup.select('a.gatherings-card-wrap')
    logger.info(f"Found {len(event_cards)} event cards")
    
    for idx, event_card in enumerate(event_cards, 1):
        event = None
        try:
            # Base info extraction with fallbacks
            title = getattr(event_card.select_one('h3'), 'text', '').strip() or 'Untitled Event'
            date_str = getattr(event_card.select_one('.card-date'), 'text', 'TBD').strip()
            event_url = event_card.get('href', '')
            
            # Image handling
            image_elem = event_card.select_one('img.card-art')
            image_url = image_elem['srcset'].split()[-2] if image_elem else ''

            # Scrape individual event page with error protection
            try:
                event_response = requests.get(event_url)
                event_soup = BeautifulSoup(event_response.text, 'html.parser')
                main_section = event_soup.select_one('.hero-stuff')
            except Exception as e:
                logger.warning(f"Partial data for {title} - using card info only")
                main_section = None

            # Description with fallback
            description = ''
            if main_section:
                desc_elem = main_section.select_one('.main-text-wrap p')
                description = desc_elem.text.strip() if desc_elem else ''

            # Location handling
            location = 'Location not specified'
            if main_section:
                loc_elem = main_section.select_one('.gather-space')
                location = loc_elem.text.replace('Location: ', '').strip() if loc_elem else location

            # Date and price parsing with fallbacks
            date_str = "TBD"
            price_amount = 0.0
            price_type = "Unknown"
            if main_section:
                date_elements = main_section.select('.gather-date p')
                date_element = next((p for p in date_elements if "|" in p.text), None)
                if date_element:
                    date_str = date_element.get_text(strip=True)
                    # Price extraction
                    price_match = re.search(r'(\$[\d\.]+|Free|TBD)', date_str)
                    if price_match:
                        price_str = price_match.group(1)
                        if "$" in price_str:
                            price_amount = float(price_str.replace("$", ""))
                            price_type = "Fixed"
                        elif "Free" in price_str:
                            price_type = "Free"
                    else:
                        logger.info(f"No price found, defaulting to unknown for: {title}")

            event = {
                "id": generate_event_id(title, date_str),
                "name": title,
                "type": "Art Workshop",
                "locationId": "loc_gather_nyc" if "NYC" in location else "loc_gather_wa",
                "communityId": "com_call_to_gather",
                "description": description,
                "startDate": parse_gather_datetime(date_str) if date_str != "TBD" else None,
                "price": {
                    "amount": price_amount,
                    "currency": "USD",
                    "type": price_type,
                    "details": "Check event page for details" if price_type == "Unknown" else ""
                },
                "image": image_url,
                "venue": {
                    "name": location.split(',')[0].strip() if location else "Venue not specified",
                    "address": location if location else "",
                    "type": "Studio"
                },
                "metadata": {
                    "source_url": event_url,
                    "featured": False
                }
            }

            # Only require name field
            if event["name"]:
                events.append(event)
                logger.info(f"Added event: {title}")
            else:
                logger.warning(f"Skipping completely unnamed event")
                
        except Exception as e:
            logger.error(f"Error processing card {idx}: {str(e)}")
            continue
    
    logger.info(f"Scraping complete. Found {len(events)} valid events")
    return {"events": events}

if __name__ == "__main__":
    try:
        data = scrape_call_to_gather()
        with open('./data/call_to_gather_events.json', 'w') as f:
            json.dump(data, f, indent=2)
            logger.info(f"Successfully wrote {len(data['events'])} events to file")
    except Exception as e:
        logger.error(f"Fatal error in main execution: {str(e)}", exc_info=True) 