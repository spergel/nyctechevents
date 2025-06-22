import logging
import re
import requests
from bs4 import BeautifulSoup
from typing import Dict, Optional

def get_luma_event_details(event_url: str) -> Optional[Dict]:
    """Fetch detailed event information from Luma event page"""
    try:
        # Make sure we have a valid URL
        if not event_url or not isinstance(event_url, str):
            return None
            
        # Normalize URL format if needed
        if event_url.startswith('LOCATION:'):
            event_url = event_url.replace('LOCATION:', '')
            
        # Ensure URL is a Luma URL
        if 'lu.ma' not in event_url:
            return None
            
        logging.info(f"Fetching details from Luma event URL: {event_url}")
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(event_url, headers=headers, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Extract event details
        details = {}
        
        # Get event title
        title_elem = soup.find('h1', {'class': 'title'})
        if title_elem:
            details['title'] = title_elem.get_text(strip=True)
        
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
        location_div = soup.select('div.jsx-4155675949.content-card:-soup-contains("Location")')
        location_details = {
            'venue_name': '',
            'address': '',
            'room': '',
            'additional_info': '',
            'type': 'Offline'  # Default to offline
        }
        
        if location_div:
            # Get venue name
            venue_name = soup.select_one('div.jsx-33066475.info div:first-child')
            if venue_name:
                location_details['venue_name'] = venue_name.get_text(strip=True)
                
            # Get address
            address = soup.select_one('div.jsx-33066475.text-tinted.fs-sm.mt-1')
            if address:
                location_details['address'] = address.get_text(strip=True)
                
            # Check if this is an online event
            if 'Register to See Address' in soup.text or 'Online Event' in soup.text:
                location_details['type'] = 'Online'
                
        details['location_details'] = location_details
            
        # Get event date and time
        date_elem = soup.select_one('div.jsx-2370077516.title.text-ellipses')
        if date_elem and not date_elem.select_one('div.shimmer'):
            details['date_display'] = date_elem.get_text(strip=True)
            
        # Get event categories
        categories = []
        category_elems = soup.select('div.jsx-3250441484.event-categories a')
        for cat in category_elems:
            category_text = cat.get_text(strip=True)
            if category_text:
                categories.append(category_text)
        details['categories'] = categories
            
        # Get speaker details
        speakers = []
        speaker_divs = soup.select('div.jsx-3733653009.flex-center.gap-2')
        for speaker in speaker_divs:
            speaker_name = speaker.select_one('div.jsx-3733653009.fw-medium.text-ellipses')
            if speaker_name:
                speakers.append({
                    'name': speaker_name.get_text(strip=True),
                    'title': '',  # Could parse from description if available
                    'bio': ''     # Could parse from description if available
                })
        details['speakers'] = speakers
        
        # Get social media links
        social_links = []
        social_divs = soup.select('div.jsx-1428039309.social-links a')
        for link in social_divs:
            href = link.get('href')
            if href:
                social_links.append(href)
        details['social_links'] = social_links
        
        # Get event image URL
        image_elem = soup.select_one('img[fetchPriority="auto"][loading="eager"]')
        if image_elem:
            img_src = image_elem.get('src')
            if img_src:
                details['image_url'] = img_src
                
        # Extract price information
        price_info = {
            "amount": 0,
            "type": "Free",
            "currency": "USD",
            "details": ""
        }
        
        price_elem = soup.select_one('div.jsx-681273248.cta-wrapper')
        if price_elem:
            price_text = price_elem.get_text(strip=True)
            if any(term in price_text.lower() for term in ['$', 'usd', 'pay']):
                # Try to extract the price
                price_match = re.search(r'\$(\d+(\.\d+)?)', price_text)
                if price_match:
                    price_info = {
                        "amount": float(price_match.group(1)),
                        "type": "Paid",
                        "currency": "USD",
                        "details": price_text
                    }
        details['price_info'] = price_info
        
        return details
        
    except Exception as e:
        logging.error(f"Error fetching Luma event details: {e}")
        return None 