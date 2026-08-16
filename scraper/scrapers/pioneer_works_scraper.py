"""Scrape upcoming Pioneer Works events from the public calendar."""

from __future__ import annotations

import hashlib
import json
import logging
import os
import re
from datetime import datetime
from typing import Dict, List, Optional, Tuple

import pytz
import requests
from bs4 import BeautifulSoup

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(SCRIPT_DIR))
DATA_DIR = os.path.join(PROJECT_ROOT, 'data', 'scrapers')

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
}
BASE_URL = 'https://pioneerworks.org'
NY_TZ = pytz.timezone('America/New_York')


def generate_event_id(title: str, start: str) -> str:
    digest = hashlib.md5(f'{title}{start}'.encode()).hexdigest()[:8]
    return f'evt_pioneer_{digest}'


def _parse_local_datetime(date_str: str, time_str: str) -> Optional[str]:
    if not date_str:
        return None
    date_str = date_str.strip()[:10]
    time_str = (time_str or '').strip()
    if not time_str:
        time_str = '00:00'
    # Accept HH:MM or H:MM
    if re.match(r'^\d{1,2}:\d{2}$', time_str):
        hour, minute = time_str.split(':')
        time_str = f'{int(hour):02d}:{int(minute):02d}'
    try:
        dt = datetime.strptime(f'{date_str} {time_str}', '%Y-%m-%d %H:%M')
        return NY_TZ.localize(dt).astimezone(pytz.utc).isoformat()
    except Exception as exc:
        logging.warning(f'Could not parse Pioneer Works datetime {date_str} {time_str}: {exc}')
        return None


def _slug_to_url_map(soup: BeautifulSoup) -> Dict[str, str]:
    """Map program/class slug -> absolute URL from visible calendar cards."""
    mapping: Dict[str, str] = {}
    for a in soup.select('a[href*="/programs/"], a[href*="/classes/"]'):
        href = a.get('href') or ''
        if not href:
            continue
        path = href.split('?')[0]
        slug = path.rstrip('/').split('/')[-1]
        if not slug:
            continue
        mapping[slug] = href if href.startswith('http') else f'{BASE_URL}{href}'
    return mapping


def _future_events_from_next_data(html: str) -> List[Dict]:
    match = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
    if not match:
        logging.error('Pioneer Works calendar missing __NEXT_DATA__')
        return []
    payload = json.loads(match.group(1))
    raw_events = payload.get('props', {}).get('pageProps', {}).get('events') or []
    today = datetime.now(NY_TZ).date()
    future: List[Dict] = []
    for event in raw_events:
        if event.get('hideFromPage'):
            continue
        cal = event.get('calendar') or {}
        start_date = (cal.get('startDate') or '')[:10]
        if not start_date:
            continue
        try:
            event_day = datetime.strptime(start_date, '%Y-%m-%d').date()
        except ValueError:
            continue
        if event_day < today:
            continue
        future.append(event)
    future.sort(key=lambda e: ((e.get('calendar') or {}).get('startDate') or ''))
    return future


def transform_event(raw: Dict, url: str) -> Dict:
    cal = raw.get('calendar') or {}
    title = raw.get('title') or 'Pioneer Works Event'
    start_date = (cal.get('startDate') or '')[:10]
    end_date = (cal.get('endDate') or start_date)[:10]
    start_time = cal.get('startTime') or cal.get('doorTime') or '19:00'
    end_time = cal.get('endTime') or '22:00'
    start_iso = _parse_local_datetime(start_date, start_time)
    end_iso = _parse_local_datetime(end_date, end_time)

    slug = (raw.get('slug') or {}).get('current') or ''
    return {
        'id': generate_event_id(title, start_iso or start_date),
        'name': title,
        'type': 'Cultural Event',
        'locationId': 'loc_pioneer_works',
        'communityId': 'com_pioneer_works',
        'description': '',
        'startDate': start_iso,
        'endDate': end_iso,
        'category': ['Arts', 'Music', 'Science'],
        'price': {
            'amount': 0,
            'type': 'Paid',
            'currency': 'USD',
            'details': 'See Pioneer Works for ticket details',
        },
        'capacity': None,
        'registrationRequired': True,
        'tags': [],
        'image': raw.get('image') or '',
        'status': 'upcoming',
        'metadata': {
            'source': 'Pioneer Works',
            'source_url': url or f'{BASE_URL}/calendar',
            'organizer': {
                'name': 'Pioneer Works',
                'instagram': '@pioneerworks',
                'email': 'info@pioneerworks.org',
                'website': BASE_URL,
            },
            'venue': {
                'name': 'Pioneer Works',
                'address': '159 Pioneer Street, Brooklyn, NY 11231',
                'type': 'Cultural Institution',
            },
            'featured': False,
            'slug': slug,
        },
    }


def main() -> Optional[str]:
    os.makedirs(DATA_DIR, exist_ok=True)
    calendar_url = f'{BASE_URL}/calendar'
    logging.info(f'Fetching Pioneer Works calendar: {calendar_url}')
    response = requests.get(calendar_url, headers=HEADERS, timeout=30)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, 'html.parser')
    slug_urls = _slug_to_url_map(soup)
    raw_events = _future_events_from_next_data(response.text)
    logging.info(f'Found {len(raw_events)} upcoming Pioneer Works events')

    events: List[Dict] = []
    for raw in raw_events:
        slug = (raw.get('slug') or {}).get('current') or ''
        url = slug_urls.get(slug) or (f'{BASE_URL}/programs/{slug}' if slug else calendar_url)
        events.append(transform_event(raw, url))

    output_file = os.path.join(DATA_DIR, 'pioneer_works_events.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({'events': events}, f, indent=2, ensure_ascii=False)
    logging.info(f'Saved {len(events)} Pioneer Works events to {output_file}')
    return output_file


if __name__ == '__main__':
    main()
