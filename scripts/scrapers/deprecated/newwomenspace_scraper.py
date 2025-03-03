import requests
import json
import logging
import hashlib
import re
from datetime import datetime

#TODO: AIRTABLE DOESNT WORK
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
)

AIRTABLE_API_URL = "https://airtable.com/v0.3/view/viwBn3Tz6w7jmqsyz/readSharedViewData"
COMMUNITY_ID = "com_new_womens_space"

def fetch_airtable_events():
    """Fetch events from Airtable API"""
    headers = {
        "accept": "*/*",
        "content-type": "application/json",
        "origin": "https://airtable.com",
        "referer": "https://airtable.com/",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 Edg/133.0.0.0",
        "x-airtable-application-id": "appsknJXw7PuCuvSh",
        "x-time-zone": "America/New_York"
    }

    cookies = {
        "__Host-airtable-session": "eyJzZXNzaW9uSWQiOiJzZXNybTBZaGJRMkVQaGtPciIsImNzcmZTZWNyZXQiOiJVd0c5SDZKSUVzcktBRWdPNzBHQTNrZ0kifQ==",
        "brw": "brwVuoVRZ8Y9Iqehl"
    }

    params = {
        "stringifiedObjectParams": "{\"shouldUseNestedResponseFormat\":true}",
        "requestId": "reqBXpW2KYC1SrGfh",
        "accessPolicy": """{"allowedActions":[{"modelClassName":"view","modelIdSelector":"viwBn3Tz6w7jmqsyz","action":"readSharedViewData"},{"modelClassName":"view","modelIdSelector":"viwBn3Tz6w7jmqsyz","action":"getMetadataForPrinting"},{"modelClassName":"view","modelIdSelector":"viwBn3Tz6w7jmqsyz","action":"readSignedAttachmentUrls"},{"modelClassName":"row","modelIdSelector":"rows * [displayedInView=viwBn3Tz6w7jmqsyz]","action":"createDocumentPreviewSession"},{"modelClassName":"view","modelIdSelector":"viwBn3Tz6w7jmqsyz","action":"downloadCsv"},{"modelClassName":"view","modelIdSelector":"viwBn3Tz6w7jmqsyz","action":"downloadICal"},{"modelClassName":"row","modelIdSelector":"rows * [displayedInView=viwBn3Tz6w7jmqsyz]","action":"downloadAttachment"}],"shareId":"shrk9LCjbNqygwC8h","applicationId":"appsknJXw7PuCuvSh","generationNumber":0,"expires":"2025-03-13T00:00:00.000Z","signature":"abc8e1271c3aab6dd8ce25279cb4abd56ec0fbb8470f20124da874d9942b03f7"}"""
    }

    try:
        response = requests.get(AIRTABLE_API_URL, headers=headers, cookies=cookies, params=params)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logging.error(f"Failed to fetch events: {str(e)}")
        return None

def transform_event(raw_event):
    """Transform Airtable event to our standardized format"""
    cells = raw_event.get('cellValuesByColumnId', {})
    
    # Generate unique ID from Airtable record ID
    event_id = hashlib.md5(raw_event['id'].encode()).hexdigest()[:8]
    
    # Parse date and time
    date_str = cells.get('fldmjcQeawSdrS2hp', '')
    start_time = cells.get('fldP0bjlw5OH45zkt', '7pm')  # Default to 7pm
    end_time = cells.get('fldVugqGKXnroeQOR', '9pm')    # Default to 9pm
    
    # Combine date with time
    start_datetime = f"{date_str[:10]}T{parse_time(start_time)}"
    end_datetime = f"{date_str[:10]}T{parse_time(end_time)}"

    # Extract price
    price_str = cells.get('fldU1J6kpPjfxq32R', '')
    price_match = re.search(r'\$(\d+)', price_str)
    price_amount = int(price_match.group(1)) if price_match else 0

    return {
        "id": f"evt_{COMMUNITY_ID}_{event_id}",
        "name": cells.get('fld86KHFxLS1smaVr', 'Untitled Event'),
        "type": "Community",
        "locationId": "loc_nyc",
        "communityId": COMMUNITY_ID,
        "description": cells.get('fldokyYbImwAkZKZm', ''),
        "startDate": start_datetime,
        "endDate": end_datetime,
        "category": ["Social", "Dating"],
        "price": {
            "amount": price_amount,
            "type": "Paid" if price_amount > 0 else "Free",
            "currency": "USD",
            "details": price_str
        },
        "capacity": 50,  # Default capacity
        "registrationRequired": True,
        "tags": ["Dating", "Women"],
        "image": extract_image_url(cells.get('fld8LnjQbyQnFxljP', [])),
        "status": "upcoming",
        "metadata": {
            "source_url": cells.get('fld9JpQ3LmxTwfaQe', ''),
            "speakers": [],
            "venue": {
                "name": "New Women's Space",
                "address": "New York, NY",
                "type": "Offline"
            },
            "featured": False
        }
    }

def parse_time(time_str):
    """Convert time string like '7pm' to ISO format"""
    try:
        return datetime.strptime(time_str.lower(), "%I%p").strftime("%H:%M:00.000Z")
    except:
        return "19:00:00.000Z"  # Fallback to 7pm

def extract_image_url(attachments):
    """Extract first image URL from attachments"""
    if attachments and len(attachments) > 0:
        return attachments[0].get('url', '')
    return "new-womens-space-default.jpg"

def main():
    raw_data = fetch_airtable_events()
    if raw_data and raw_data.get('data'):
        events = raw_data['data']['table']['rows']
        transformed = [transform_event(e) for e in events]
        
        with open('./data/newwomenspace_events.json', 'w') as f:
            json.dump({"events": transformed}, f, indent=2)
        logging.info(f"Saved {len(transformed)} events")
    else:
        logging.warning("No events found or failed to fetch data")

if __name__ == "__main__":
    main()
