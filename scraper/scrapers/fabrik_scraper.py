"""Scrape public NYC Fabrik gatherings from api.joinfabrik.com."""

from __future__ import annotations

import hashlib
import json
import logging
import os
import re
from datetime import datetime
from typing import Dict, List, Optional
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode

import pytz
import requests

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(SCRIPT_DIR))
DATA_DIR = os.path.join(PROJECT_ROOT, 'data', 'scrapers')

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

FABRIK_COMMUNITY_ID = 'com_fabrik_ny'
API_BASE = 'https://api.joinfabrik.com'
NYC_SPACES = {'Tribeca', 'Dumbo'}
NY_TZ = pytz.timezone('America/New_York')
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Content-Type': 'application/json',
}

SPACE_ADDRESSES = {
    'Tribeca': 'Fabrik Tribeca, New York, NY',
    'Dumbo': 'Fabrik Dumbo, Brooklyn, NY',
}


def _clean_url(url: str) -> str:
    if not url:
        return ''
    parsed = urlparse(url.strip())
    # Drop luma embed tracking params
    query = [(k, v) for k, v in parse_qsl(parsed.query) if k not in ('lm_source',)]
    return urlunparse(parsed._replace(query=urlencode(query)))


def _parse_fabrik_datetime(date_str: str, time_str: str) -> Optional[str]:
    if not date_str:
        return None
    date_str = date_str.strip()[:10]
    time_str = (time_str or '').strip()
    if not time_str:
        time_str = '12:00 PM'
    # Normalize odd spacing: "2:00 PM"
    time_str = re.sub(r'\s+', ' ', time_str)
    for fmt in ('%Y-%m-%d %I:%M %p', '%Y-%m-%d %I %p', '%Y-%m-%d %H:%M'):
        try:
            dt = datetime.strptime(f'{date_str} {time_str}', fmt)
            return NY_TZ.localize(dt).astimezone(pytz.utc).isoformat()
        except ValueError:
            continue
    logging.warning(f'Could not parse Fabrik datetime {date_str} {time_str}')
    return None


def fetch_all_gatherings() -> List[Dict]:
    page = 1
    items: List[Dict] = []
    while True:
        url = f'{API_BASE}/guests/all-gatherings?page={page}'
        logging.info(f'Fetching Fabrik gatherings page {page}')
        response = requests.get(url, headers=HEADERS, timeout=30)
        response.raise_for_status()
        payload = response.json()
        batch = payload.get('items') or []
        items.extend(batch)
        total_pages = int(payload.get('total_pages') or 1)
        if page >= total_pages:
            break
        page += 1
    return items


def convert_gathering(item: Dict) -> Optional[Dict]:
    space = item.get('space') or {}
    space_name = space.get('name') or ''
    if space_name not in NYC_SPACES:
        return None
    if not item.get('is_public'):
        return None
    if (item.get('status') or '').lower() != 'published':
        return None

    date_str = item.get('date') or ''
    today = datetime.now(NY_TZ).date().isoformat()
    if date_str < today:
        return None

    source_url = _clean_url(item.get('luma_link') or '')
    if not source_url:
        # Fall back to Fabrik short link when present
        code = item.get('short_code') or ''
        source_url = f'https://app.joinfabrik.com/{code}' if code else 'https://www.joinfabrik.com/gatherings'

    title = (item.get('title') or 'Fabrik Gathering').strip()
    start_iso = _parse_fabrik_datetime(date_str, item.get('start_time') or '')
    end_iso = _parse_fabrik_datetime(date_str, item.get('end_time') or '')
    raw_id = str(item.get('id') or title)
    event_id = f"evt_fabrik_{hashlib.md5(f'{raw_id}{start_iso}'.encode()).hexdigest()[:8]}"

    return {
        'id': event_id,
        'name': title,
        'type': item.get('category') or 'Community',
        'locationId': 'loc_fabrik' if space_name == 'Tribeca' else '',
        'communityId': FABRIK_COMMUNITY_ID,
        'description': item.get('description') or '',
        'startDate': start_iso,
        'endDate': end_iso,
        'category': [item.get('category')] if item.get('category') else ['Community'],
        'price': {
            'amount': 0,
            'type': 'Free',
            'currency': 'USD',
            'details': 'See registration link for details',
        },
        'capacity': item.get('event_size'),
        'registrationRequired': True,
        'tags': ['fabrik'],
        'image': item.get('image_url') or '',
        'status': 'upcoming',
        'metadata': {
            'source': 'Fabrik',
            'source_url': source_url,
            'organizer': {
                'name': (item.get('community') or 'Fabrik').strip() or 'Fabrik',
                'website': 'https://www.joinfabrik.com',
            },
            'venue': {
                'name': f'Fabrik {space_name}',
                'address': SPACE_ADDRESSES.get(space_name, f'Fabrik {space_name}, New York, NY'),
                'type': 'Community Space',
            },
            'featured': bool(item.get('is_featured')),
            'members_only': bool(item.get('is_members_only')),
            'original_event_id': item.get('id'),
        },
    }


def main() -> Optional[str]:
    os.makedirs(DATA_DIR, exist_ok=True)
    gatherings = fetch_all_gatherings()
    events = []
    for item in gatherings:
        converted = convert_gathering(item)
        if converted:
            events.append(converted)

    events.sort(key=lambda e: e.get('startDate') or '')
    output_file = os.path.join(DATA_DIR, 'fabrik_events.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({'events': events}, f, indent=2, ensure_ascii=False)
    logging.info(f'Saved {len(events)} public NYC Fabrik events to {output_file}')
    return output_file


if __name__ == '__main__':
    main()
