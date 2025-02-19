import requests
from bs4 import BeautifulSoup
from datetime import datetime
import hashlib
import json
import os
import logging
import pytz
import re

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.FileHandler('scraper.log'), logging.StreamHandler()]
)

def clean_text(text):
    """Clean text by removing extra whitespace and HTML entities"""
    if not text:
        return ""
    # Replace HTML entities and remove extra whitespace
    text = re.sub(r'\s+', ' ', text.replace('\u00a0', ' '))
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    return text.strip()

def parse_time(time_str):
    """Parse time string to datetime object with better error handling"""
    if not time_str:
        return None
        
    # Clean up the time string
    time_str = clean_text(time_str)
    
    # Try different time formats
    formats = [
        '%I:%M %p',
        '%I:%M%p',
        '%H:%M',
        '%I %p',
        '%I%p'
    ]
    
    for fmt in formats:
        try:
            return datetime.strptime(time_str.strip(), fmt).time()
        except ValueError:
            continue
    
    return None

def extract_categories(desc_text):
    """Extract categories from description text"""
    if not desc_text:
        return []
        
    # Look for "Category:" or "Categories:" followed by comma-separated values
    category_match = re.search(r'Category(?:ies)?:\s*([^!]+)(?:Free!|$)', desc_text)
    if category_match:
        categories = [cat.strip() for cat in category_match.group(1).split(',')]
        return [cat for cat in categories if cat]
    return []

def clean_description(desc):
    """Clean and format description text"""
    if not desc:
        return ""
        
    # Remove category section
    desc = re.sub(r'Category(?:ies)?:[^!]+(?:Free!|$)', '', desc)
    
    # Clean HTML and extra whitespace
    desc = clean_text(desc)
    
    # Remove duplicate content
    if desc.count('.') > 1:
        first_sentence = desc.split('.')[0] + '.'
        if desc.count(first_sentence) > 1:
            desc = desc.split(first_sentence)[0] + first_sentence
            
    return desc

def fix_image_url(url):
    """Fix malformed image URLs"""
    if not url:
        return None
        
    # Remove duplicate domain
    url = re.sub(r'https://static\.nycgovparks\.org(?=https://static\.nycgovparks\.org)', '', url)
    
    # Ensure URL starts with proper domain
    if not url.startswith('http'):
        url = f"https://static.nycgovparks.org{url}"
        
    return url

def get_event_details(event_url, headers):
    """Fetch additional details from individual event page"""
    try:
        response = requests.get(event_url, headers=headers)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        details = {}
        
        # Extract coordinates with better error handling
        map_locations = soup.find('span', {'class': 'map_locations'})
        if map_locations:
            try:
                coords = map_locations.get('id', '').split('__')
                if len(coords) >= 2:
                    details['coordinates'] = {
                        'latitude': float(coords[0]),
                        'longitude': float(coords[1])
                    }
            except (ValueError, IndexError):
                logging.warning(f"Could not parse coordinates from {event_url}")
        
        # Extract accessibility info
        location_div = soup.find('div', {'class': 'location'})
        if location_div:
            accessibility_img = location_div.find('img', alt=lambda x: x and 'Accessible' in x)
            details['accessible'] = bool(accessibility_img)
        
        # Extract contact number and clean it
        contact_section = soup.find(lambda tag: tag.name == 'h3' and 'Contact Number' in tag.text)
        if contact_section and contact_section.find_next('p'):
            phone = re.sub(r'\D', '', contact_section.find_next('p').text)
            details['contact_number'] = phone if phone else None
        
        # Extract registration info with better URL validation
        registration_section = soup.find(lambda tag: tag.name == 'h3' and 'Registration' in tag.text)
        if registration_section:
            registration_link = registration_section.find_next('p', {'class': 'registration-link'})
            if registration_link:
                details['registration_required'] = True
                reg_url = registration_link.find('a')['href'] if registration_link.find('a') else None
                details['registration_url'] = reg_url if reg_url and reg_url.startswith('http') else None
            else:
                details['registration_required'] = False
        
        # Extract related links with better validation
        links_div = soup.find('div', {'id': 'event_links'})
        if links_div:
            links = []
            for link in links_div.find_all('a'):
                url = link.get('href', '')
                if url and url.startswith('http'):
                    links.append({
                        'text': clean_text(link.text),
                        'url': url
                    })
            details['related_links'] = links
        
        # Extract full description and clean it
        desc_div = soup.find('div', {'class': 'description'})
        if desc_div:
            details['full_description'] = clean_description(desc_div.text)
        
        # Extract and clean address
        address_div = soup.find('div', {'itemtype': 'http://schema.org/PostalAddress'})
        if address_div:
            address = clean_text(address_div.text)
            # Add borough if not in address
            if location_div:
                borough = re.search(r'in\s+([^,]+)(?:,\s*([^)]+))?', location_div.text)
                if borough and borough.group(2) and borough.group(2) not in address:
                    address = f"{address}, {borough.group(2)}"
            details['address'] = address
        
        return details
        
    except Exception as e:
        logging.error(f"Error fetching event details from {event_url}: {str(e)}")
        return {}

def scrape_nycparks_events(date=None):
    """Scrape events from NYC Parks website for a specific date"""
    
    if date:
        url = f"https://www.nycgovparks.org/events/f{date}"
    else:
        url = "https://www.nycgovparks.org/events"
        
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }

    try:
        logging.info(f"Requesting URL: {url}")
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        events = []
        
        # Find all event divs
        event_divs = soup.find_all('div', {'class': 'row', 'itemtype': 'http://schema.org/Event'})
        
        for event_div in event_divs:
            try:
                # Extract date from previous h2 element
                date_header = event_div.find_previous('h2', {'class': 'clearleft'})
                if date_header and date_header.get('id'):
                    event_date = date_header.get('id')
                else:
                    continue
                
                # Extract event details
                title_elem = event_div.find('h3', {'class': 'event-title'})
                title = clean_text(title_elem.find('a').text) if title_elem else None
                event_url = f"https://www.nycgovparks.org{title_elem.find('a')['href']}" if title_elem else None
                
                location_elem = event_div.find('h4', {'class': 'location'})
                location = clean_text(location_elem.text) if location_elem else None
                
                # Extract and parse time
                time_elem = event_div.find('strong')
                start_time = None
                end_time = None
                if time_elem:
                    time_text = time_elem.parent.text
                    times = time_text.split('–')
                    if len(times) == 2:
                        start_time = parse_time(times[0])
                        end_time = parse_time(times[1])
                
                # Extract and clean description
                desc_elem = event_div.find('span', {'class': 'description'})
                description = desc_elem.text if desc_elem else None
                
                # Extract categories from description
                categories = extract_categories(description)
                if not categories and title:
                    categories = [title]  # Use title as fallback category
                
                # Clean description after extracting categories
                description = clean_description(description)
                
                # Extract and fix image URL
                image_elem = event_div.find('img')
                image_url = fix_image_url(image_elem['src']) if image_elem and image_elem.get('src') else None
                
                # Get additional details from event page
                additional_details = get_event_details(event_url, headers) if event_url else {}
                
                # Generate unique ID
                id_string = f"{title}{event_date}{start_time}".encode()
                event_id = f"evt_nycparks_{hashlib.md5(id_string).hexdigest()[:8]}"
                
                # Create event object
                event = {
                    "id": event_id,
                    "name": title,
                    "type": categories[0] if categories else "Community Event",
                    "locationId": "loc_tbd",  # Would need location mapping
                    "communityId": "com_nyc_parks",
                    "description": additional_details.get('full_description', description),
                    "startDate": f"{event_date}T{start_time.strftime('%I:%M %p')}" if start_time else event_date,
                    "endDate": f"{event_date}T{end_time.strftime('%I:%M %p')}" if end_time else event_date,
                    "category": categories,
                    "price": {
                        "amount": 0,
                        "type": "Free",
                        "currency": "USD"
                    },
                    "registrationRequired": additional_details.get('registration_required', False),
                    "tags": categories,
                    "image": image_url,
                    "status": "upcoming",
                    "metadata": {
                        "source_url": event_url,
                        "venue": {
                            "name": location,
                            "address": additional_details.get('address', ''),
                            "type": "Offline",
                            "coordinates": additional_details.get('coordinates'),
                            "accessible": additional_details.get('accessible', False)
                        },
                        "contact_number": additional_details.get('contact_number'),
                        "registration_url": additional_details.get('registration_url'),
                        "related_links": additional_details.get('related_links', [])
                    }
                }
                
                events.append(event)
                
            except Exception as e:
                logging.error(f"Error processing event: {str(e)}")
                continue
        
        # Create directory if not exists
        os.makedirs('scripts/scrapers/data', exist_ok=True)
        
        # Save events
        with open('./data/nycparks_events.json', 'w') as f:
            json.dump({"events": events}, f, indent=2)
            
        logging.info(f"Successfully scraped {len(events)} events")
        return events
        
    except requests.exceptions.RequestException as e:
        logging.error(f"Request failed: {str(e)}")
        return []
    except Exception as e:
        logging.error(f"Unexpected error: {str(e)}")
        return []

if __name__ == '__main__':
    scrape_nycparks_events() 