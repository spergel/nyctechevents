import requests
import json
import logging
from datetime import datetime
import hashlib
import os

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s')

def fetch_fiftyseven_events(cursor=None):
    """Fetch events from FiftySeven NYC API with pagination"""
    url = "https://www.fiftyseven.nyc/api/getPosts"
    headers = {
        "accept": "application/json, text/plain, */*",
        "content-type": "application/json",
        "origin": "https://www.fiftyseven.nyc",
        "referer": "https://www.fiftyseven.nyc/calendar",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36"
    }
    
    payload = {
        "cursor": cursor if cursor else None,
        "pageSize": 50,  # Increased page size
        "groupId": "clfi9j47x0000rrrkyg1p32f5",
        "filter": {
            "entityFeed": {
                "startTime": datetime.now().isoformat()
            }
        }
    }

    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()
        logging.info(f"Fetched {len(data.get('posts', []))} events")
        return data
    except Exception as e:
        logging.error(f"Failed to fetch events: {str(e)}")
        return None

def transform_event(raw_event, community_id="com_57"):
    """Transform raw API event to our format"""
    try:
        # Generate consistent ID
        event_id = hashlib.md5(raw_event['id'].encode()).hexdigest()[:8]
        
        # Extract event details
        content = raw_event.get('content', '')
        entity = raw_event.get('entity', {})
        links = raw_event.get('links', [])
        user = raw_event.get('user', {})
        
        # Get image URL from links if available
        image_url = None
        if links and len(links) > 0:
            image_url = links[0].get('imageUrl')
        
        event = {
            "id": f"evt_{community_id}_{event_id}",
            "name": links[0].get('title', 'Untitled Event') if links else content[:50],
            "type": "Community",
            "locationId": "loc_nyc",
            "communityId": community_id,
            "description": content,
            "startDate": entity.get('startTime'),
            "endDate": entity.get('endTime'),
            "category": ["Community", "Social"],
            "price": {
                "amount": 0,
                "type": "Free",
                "currency": "USD",
                "details": ""
            },
            "capacity": None,
            "registrationRequired": True,
            "tags": [],
            "image": image_url or "57-event.jpg",
            "status": "upcoming",
            "metadata": {
                "source_url": links[0].get('link') if links else None,
                "organizer": {
                    "name": f"{user.get('firstName', '')} {user.get('lastName', '')}".strip(),
                    "instagram": user.get('Instagram'),
                    "email": user.get('email')
                },
                "venue": {
                    "name": "New York City",
                    "address": "",
                    "type": "Offline"
                },
                "featured": False
            }
        }
        
        # Try to extract price from description
        if '$' in content:
            import re
            price_matches = re.findall(r'\$(\d+(?:\.\d{2})?)', content)
            if price_matches:
                try:
                    event['price']['amount'] = float(price_matches[0])
                    event['price']['type'] = 'Fixed'
                except ValueError:
                    pass

        return event
    except Exception as e:
        logging.error(f"Failed to transform event {raw_event.get('id')}: {str(e)}")
        return None

def main():
    all_events = []
    cursor = None
    
    # Create data directory if it doesn't exist
    os.makedirs('scripts/scrapers/data', exist_ok=True)
    
    while True:
        data = fetch_fiftyseven_events(cursor)
        if not data or not data.get('posts'):
            break
            
        # Transform events
        events = []
        for raw_event in data['posts']:
            if raw_event.get('entity', {}).get('type') == 'EVENT':
                event = transform_event(raw_event)
                if event:
                    events.append(event)
        
        all_events.extend(events)
        
        # Update cursor for next page
        cursor = data.get('endCursor')
        if not cursor:
            break
            
        logging.info(f"Fetched {len(events)} events, total: {len(all_events)}")
    
    # Save events
    if all_events:
        output_file = './data/57_events.json'
        with open(output_file, 'w') as f:
            json.dump({"events": all_events}, f, indent=2)
        logging.info(f"Saved {len(all_events)} events to {output_file}")
    else:
        logging.warning("No events were fetched")

if __name__ == "__main__":
    main() 