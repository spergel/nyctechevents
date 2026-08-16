import json
import logging
import re
import requests
from bs4 import BeautifulSoup
from typing import Dict, List, Optional


def _parse_luma_json_ld(soup: BeautifulSoup) -> Dict:
    """Extract host + venue from Luma's schema.org Event JSON-LD when present."""
    parsed: Dict = {}
    for script in soup.find_all('script', attrs={'type': 'application/ld+json'}):
        raw = script.string or script.get_text() or ''
        if not raw.strip():
            continue
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue

        candidates = data if isinstance(data, list) else [data]
        for item in candidates:
            if not isinstance(item, dict):
                continue
            types = item.get('@type')
            type_list = types if isinstance(types, list) else [types]
            if 'Event' not in type_list:
                continue

            if item.get('name'):
                parsed['title'] = item['name']
            if item.get('description'):
                parsed['full_description'] = item['description']
            if item.get('image'):
                images = item['image']
                parsed['image_url'] = images[0] if isinstance(images, list) and images else images

            location = item.get('location') or {}
            if isinstance(location, dict):
                address = location.get('address') or {}
                street = ''
                if isinstance(address, dict):
                    parts = [
                        address.get('streetAddress') or '',
                        address.get('addressLocality') or '',
                        address.get('addressRegion') or '',
                    ]
                    # Avoid duplicating venue name as the only street line when fuller address exists elsewhere
                    street = ', '.join(p for p in parts if p)
                elif isinstance(address, str):
                    street = address

                venue_name = location.get('name') or ''
                # If streetAddress was just the venue name, prefer geo-less name-only and leave address blank
                if street.strip().lower() == venue_name.strip().lower():
                    street = ''

                parsed['location_details'] = {
                    'venue_name': venue_name,
                    'address': street,
                    'room': '',
                    'additional_info': '',
                    'type': 'Online' if 'Online' in str(item.get('eventAttendanceMode', '')) else 'Offline',
                    'lat': (location.get('geo') or {}).get('latitude') if isinstance(location.get('geo'), dict) else location.get('latitude'),
                    'lng': (location.get('geo') or {}).get('longitude') if isinstance(location.get('geo'), dict) else location.get('longitude'),
                }

            organizers = item.get('organizer') or []
            if isinstance(organizers, dict):
                organizers = [organizers]
            hosts: List[Dict] = []
            for org in organizers:
                if not isinstance(org, dict):
                    continue
                org_types = org.get('@type')
                org_type_list = org_types if isinstance(org_types, list) else [org_types]
                hosts.append({
                    'name': (org.get('name') or '').strip(),
                    'url': org.get('url') or '',
                    'image': org.get('image') or '',
                    'type': 'Organization' if 'Organization' in org_type_list else 'Person',
                })
            hosts = [h for h in hosts if h['name']]
            if hosts:
                parsed['hosts'] = hosts
                # Prefer an Organization calendar as the primary community host
                primary = next((h for h in hosts if h['type'] == 'Organization'), hosts[0])
                parsed['primary_host'] = primary

            offers = item.get('offers') or []
            if isinstance(offers, dict):
                offers = [offers]
            if offers and isinstance(offers[0], dict):
                price = offers[0].get('price')
                currency = (offers[0].get('priceCurrency') or 'USD').upper()
                try:
                    amount = float(price) if price is not None else 0
                except (TypeError, ValueError):
                    amount = 0
                parsed['price_info'] = {
                    'amount': amount,
                    'type': 'Paid' if amount > 0 else 'Free',
                    'currency': currency,
                    'details': offers[0].get('name') or '',
                }
            break
    return parsed


def get_luma_event_details(event_url: str) -> Optional[Dict]:
    """Fetch detailed event information from Luma event page"""
    try:
        # Make sure we have a valid URL
        if not event_url or not isinstance(event_url, str):
            return None
            
        # Normalize URL format if needed
        if event_url.startswith('LOCATION:'):
            event_url = event_url.replace('LOCATION:', '')
            
        # Ensure URL is a Luma URL (legacy lu.ma or current luma.com)
        if 'lu.ma' not in event_url and 'luma.com' not in event_url:
            return None

        # Normalize legacy host
        event_url = event_url.replace('https://lu.ma/', 'https://luma.com/').replace('http://lu.ma/', 'https://luma.com/')
            
        logging.info(f"Fetching details from Luma event URL: {event_url}")
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(event_url, headers=headers, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Prefer structured JSON-LD (host calendar + venue) when Luma provides it
        details = _parse_luma_json_ld(soup)
        
        # Get event title
        if not details.get('title'):
            title_elem = soup.find('h1', {'class': 'title'})
            if title_elem:
                details['title'] = title_elem.get_text(strip=True)
        
        # Get full description/about section
        if not details.get('full_description'):
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
                
        # Get detailed location info (CSS fallback when JSON-LD lacked it)
        location_details = details.get('location_details') or {
            'venue_name': '',
            'address': '',
            'room': '',
            'additional_info': '',
            'type': 'Offline'  # Default to offline
        }
        
        location_div = soup.select('div.jsx-4155675949.content-card:-soup-contains("Location")')
        if location_div and not location_details.get('venue_name'):
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
        if speakers and not details.get('speakers'):
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
        if not details.get('image_url'):
            image_elem = soup.select_one('img[fetchPriority="auto"][loading="eager"]')
            if image_elem:
                img_src = image_elem.get('src')
                if img_src:
                    details['image_url'] = img_src
                
        # Extract price information
        if 'price_info' not in details:
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