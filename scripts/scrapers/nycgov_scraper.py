import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
import hashlib
import json
import os
import logging
import pytz
import re
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.FileHandler('scraper.log'), logging.StreamHandler()]
)

def get_date_range():
    """Get start and end dates in the required format"""
    today = datetime.now()
    end_date = today + timedelta(days=365)  # Look ahead 1 year
    
    return {
        'startDate': today.strftime('%m/%d/%Y %I:%M %p'),
        'endDate': end_date.strftime('%m/%d/%Y %I:%M %p')
    }

def parse_time_part(time_part):
    """Parse time part string into start and end times"""
    if not time_part:
        return None, None
        
    # Common patterns: "10am to 6pm", "2:30pm to 4pm", "All Day"
    if time_part.lower() == "all day":
        return "12:00 AM", "11:59 PM"
        
    match = re.search(r'(\d+(?::\d+)?(?:am|pm))\s+to\s+(\d+(?::\d+)?(?:am|pm))', time_part.lower())
    if match:
        return match.group(1), match.group(2)
    
    return None, None

def parse_date_with_time(date_part, time_part):
    """Combine date and time parts into full datetime string"""
    if not date_part:
        return None
        
    try:
        # Parse date part (e.g., "Feb 15")
        date_obj = datetime.strptime(date_part, '%b %d')
        # Add current year
        date_obj = date_obj.replace(year=datetime.now().year)
        
        # If date is in past, assume next year
        if date_obj.date() < datetime.now().date():
            date_obj = date_obj.replace(year=date_obj.year + 1)
            
        if time_part:
            start_time, end_time = parse_time_part(time_part)
            if start_time:
                try:
                    time_obj = datetime.strptime(start_time, '%I:%M %p').time()
                    return datetime.combine(date_obj.date(), time_obj).strftime('%Y-%m-%dT%H:%M:%S.000-05:00')
                except ValueError:
                    try:
                        time_obj = datetime.strptime(start_time, '%I%p').time()
                        return datetime.combine(date_obj.date(), time_obj).strftime('%Y-%m-%dT%H:%M:%S.000-05:00')
                    except ValueError:
                        pass
                        
        # If no valid time, use midnight
        return datetime.combine(date_obj.date(), datetime.min.time()).strftime('%Y-%m-%dT%H:%M:%S.000-05:00')
    except ValueError as e:
        logging.error(f"Error parsing date: {date_part} {time_part} - {str(e)}")
        return None

def clean_html(text):
    """Clean HTML from text"""
    if not text:
        return ""
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Fix escaped HTML entities
    text = text.replace('\\"', '"').replace('\\/', '/')
    return text.strip()

def get_borough_name(code):
    """Convert borough code to full name"""
    borough_map = {
        'Bk': 'Brooklyn',
        'Mn': 'Manhattan',
        'Qn': 'Queens',
        'Bx': 'Bronx',
        'Si': 'Staten Island',
        'Ot': 'Other'
    }
    return borough_map.get(code, code)

def scrape_nycgov_events(page_number=1, category="Kids and Family"):
    """Scrape events from NYC.gov API for a specific category"""
    
    base_url = "https://api.nyc.gov/calendar/search"
    date_range = get_date_range()
    
    params = {
        'startDate': date_range['startDate'],
        'endDate': date_range['endDate'],
        'categories': category,
        'categoryOperator': 'OR',
        'sort': 'DATE',
        'pageNumber': str(page_number)  # Ensure page number is a string
    }
    
    headers = {
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Connection": "keep-alive",
        "Ocp-Apim-Subscription-Key": "3a3248a64bcf44c88984fae3e745c0d7",
        "Origin": "https://www.nyc.gov",
        "Referer": "https://www.nyc.gov/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
        "sec-ch-ua": '"Not(A:Brand";v="99", "Microsoft Edge";v="133", "Chromium";v="133"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"'
    }

    try:
        logging.info(f"Requesting URL: {base_url} with page {page_number} for category: {category}")
        response = requests.get(base_url, params=params, headers=headers)
        response.raise_for_status()
        
        data = response.json()
        events = []
        
        items = data.get('items', [])
        if not items:
            logging.info(f"No events found for {category} on page {page_number}")
            return [], False
            
        for item in items:
            try:
                # Generate unique ID
                id_string = f"{item['name']}{item.get('datePart', '')}{item.get('timePart', '')}".encode()
                event_id = f"evt_nycgov_{hashlib.md5(id_string).hexdigest()[:8]}"
                
                # Handle dates
                start_date = parse_date_with_time(item.get('datePart'), item.get('timePart'))
                if not start_date:
                    continue
                    
                # For end date, use start date if not provided
                end_date = start_date
                if item.get('timePart'):
                    _, end_time = parse_time_part(item['timePart'])
                    if end_time:
                        try:
                            date_obj = datetime.strptime(start_date, '%Y-%m-%dT%H:%M:%S.000-05:00')
                            time_obj = datetime.strptime(end_time, '%I:%M %p').time()
                            end_date = datetime.combine(date_obj.date(), time_obj).strftime('%Y-%m-%dT%H:%M:%S.000-05:00')
                        except ValueError:
                            try:
                                time_obj = datetime.strptime(end_time, '%I%p').time()
                                end_date = datetime.combine(date_obj.date(), time_obj).strftime('%Y-%m-%dT%H:%M:%S.000-05:00')
                            except ValueError:
                                pass
                
                # Get full borough names
                boroughs = [get_borough_name(b) for b in item.get('boroughs', [])]
                
                # Clean description
                description = clean_html(item.get('desc', item.get('shortDesc', '')))
                
                # Create event object
                event = {
                    "id": event_id,
                    "name": item['name'],
                    "type": category,
                    "locationId": "loc_tbd",  # Would need location mapping
                    "communityId": "com_nyc_gov",
                    "description": description,
                    "startDate": start_date,
                    "endDate": end_date,
                    "category": [category],
                    "price": {
                        "amount": 0,
                        "type": "Free",
                        "currency": "USD"
                    },
                    "registrationRequired": False,
                    "tags": [
                        category.lower(),
                        item.get('agencyName', '').lower(),
                        *[b.lower() for b in boroughs]
                    ],
                    "status": "canceled" if item.get('canceled') else "upcoming",
                    "metadata": {
                        "source_url": item.get('permalink'),
                        "venue": {
                            "name": item.get('address', ''),
                            "address": item.get('address', ''),
                            "type": "Offline",
                            "borough": boroughs[0] if boroughs else None,
                            "addressType": item.get('addressType')
                        },
                        "agency": {
                            "name": item.get('agencyName'),
                            "acronym": item.get('agencyAcronym')
                        },
                        "cityPick": item.get('cityPick', False),
                        "allDay": item.get('allDay', False),
                        "guid": item.get('guid'),
                        "original_id": item.get('id'),
                        "sequence": item.get('sequence'),
                        "mapType": item.get('mapType'),
                        "datePart": item.get('datePart'),
                        "timePart": item.get('timePart')
                    }
                }
                
                # Add category-specific tags
                if category == "Kids and Family":
                    event["tags"].extend(["children", "family events"])
                elif category == "Street and Neighborhood":
                    event["tags"].extend(["community", "street events", "neighborhood"])
                
                events.append(event)
                
            except Exception as e:
                logging.error(f"Error processing event: {str(e)}")
                continue
        
        # Create directory if not exists
        os.makedirs('scripts/scrapers/data', exist_ok=True)
        
        # Save events
        output_file = f'./data/nycgov_{category.lower().replace(" ", "_")}_events.json'
        
        # If first page, create new file, otherwise append to existing
        if page_number == 1:
            with open(output_file, 'w') as f:
                json.dump({"events": events}, f, indent=2)
        else:
            try:
                with open(output_file, 'r') as f:
                    existing_data = json.load(f)
                existing_data['events'].extend(events)
                with open(output_file, 'w') as f:
                    json.dump(existing_data, f, indent=2)
            except FileNotFoundError:
                with open(output_file, 'w') as f:
                    json.dump({"events": events}, f, indent=2)
            
        logging.info(f"Successfully scraped {len(events)} {category} events from page {page_number}")
        
        # Return events and whether there might be more pages
        # Continue if we got any events at all (the API might return varying numbers per page)
        return events, bool(events)
        
    except requests.exceptions.RequestException as e:
        logging.error(f"Request failed: {str(e)}")
        return [], False
    except Exception as e:
        logging.error(f"Unexpected error: {str(e)}")
        return [], False

def scrape_all_pages(max_pages=20, categories=None):  # Increased to 52 pages (2 more)
    """Scrape multiple pages of events for multiple categories"""
    if categories is None:
        categories = ["Kids and Family", "Street and Neighborhood"]
        
    all_events = []
    
    for category in categories:
        page = 1
        category_events = []
        empty_pages = 0  # Track consecutive empty pages
        
        while page <= max_pages and empty_pages < 3:  # Stop if we get 3 empty pages in a row
            events, has_more = scrape_nycgov_events(page, category)
            if events:
                category_events.extend(events)
                empty_pages = 0  # Reset empty pages counter
            else:
                empty_pages += 1
                logging.info(f"Empty page {page} for {category} (empty pages: {empty_pages})")
            
            if not has_more:
                logging.info(f"No more events indicated for {category}")
                break
                
            page += 1
            # Add a small delay between requests to be nice to the API
            time.sleep(0.5)
        
        logging.info(f"Completed scraping {len(category_events)} {category} events from {page} pages")
        all_events.extend(category_events)
    
    logging.info(f"Completed scraping {len(all_events)} total events")
    return all_events

if __name__ == '__main__':
    scrape_all_pages() 