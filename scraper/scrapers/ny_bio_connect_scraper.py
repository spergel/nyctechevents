"""Scrape NYC events from New York Bio Connect event listings."""

from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import subprocess
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set
from urllib.parse import urljoin

import pytz
from bs4 import BeautifulSoup

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(SCRIPT_DIR))
DATA_DIR = os.path.join(PROJECT_ROOT, 'data', 'scrapers')

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

BASE_URL = 'https://newyorkbioconnect.com'
LISTING_URL = f'{BASE_URL}/events/?region=nyc'
COMMUNITY_ID = 'com_ny_bio_connect'
NY_TZ = pytz.timezone('America/New_York')
HEADERS_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

# region=nyc occasionally includes mis-tagged upstate events
NON_NYC_HINTS = (
    'buffalo',
    'upstate',
    'rochester',
    'albany',
    'syracuse',
    'ithaca',
    'capital region',
    'finger lakes',
    'western new york',
)


def _fetch(url: str) -> str:
    """Fetch via curl — this host rejects older OpenSSL clients used by some local Pythons."""
    result = subprocess.run(
        ['curl', '-sL', '-A', HEADERS_UA, url],
        capture_output=True,
        text=True,
        timeout=60,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(f'curl failed for {url}: {result.stderr[:200]}')
    return result.stdout


def _parse_datetime(date_text: str, time_text: str = '') -> Optional[str]:
    date_text = re.sub(r'\s+', ' ', (date_text or '').strip())
    time_text = re.sub(r'\s+', ' ', (time_text or '').strip())
    time_text = re.sub(r'\s+(EDT|EST|UTC|GMT)$', '', time_text, flags=re.I)
    if not date_text:
        return None

    candidates = []
    if time_text:
        candidates.append(f'{date_text} {time_text}')
    candidates.append(date_text)

    for raw in candidates:
        for fmt in ('%B %d, %Y %I:%M %p', '%B %d, %Y %I %p', '%B %d, %Y'):
            try:
                dt = datetime.strptime(raw, fmt)
                if fmt == '%B %d, %Y':
                    dt = dt.replace(hour=9, minute=0)
                return NY_TZ.localize(dt).astimezone(pytz.utc).isoformat()
            except ValueError:
                continue
    return None


def _is_probably_nyc(title: str, description: str) -> bool:
    blob = f'{title} {description}'.lower()
    # Explicit NYC wins even if "upstate" appears in partner copy
    if re.search(r'\bnyc\b|\bnew york city\b|manhattan|brooklyn|queens|bronx', blob):
        return True
    return not any(hint in blob for hint in NON_NYC_HINTS)


def _extract_cards(html: str) -> List[Dict]:
    soup = BeautifulSoup(html, 'html.parser')
    cards = []
    for card in soup.select('a.event-card'):
        title_el = card.select_one('.event-card__title')
        date_el = card.select_one('.event-card__date')
        time_el = card.select_one('.event-card__time')
        desc_el = card.select_one('.event-card__description')
        status_el = card.select_one('.event-card__card-tag')
        industries = [
            t.get_text(strip=True)
            for t in card.select('.event-card__tag-list .tag')
            if t.get_text(strip=True)
        ]
        type_tags = [
            t.get_text(strip=True)
            for t in card.select('.tag.secondary')
            if t.get_text(strip=True)
        ]
        cards.append({
            'name': title_el.get_text(strip=True) if title_el else '',
            'date_text': date_el.get_text(strip=True) if date_el else '',
            'time_text': time_el.get_text(strip=True) if time_el else '',
            'description': desc_el.get_text(' ', strip=True) if desc_el else '',
            'url': card.get('href') or LISTING_URL,
            'status': status_el.get_text(strip=True) if status_el else '',
            'industries': industries,
            'event_type': type_tags[0] if type_tags else '',
        })
    return cards


def convert_card(card: Dict) -> Optional[Dict]:
    title = (card.get('name') or '').strip()
    if not title:
        return None
    if not _is_probably_nyc(title, card.get('description') or ''):
        logging.info(f'Skipping non-NYC Bio Connect event: {title}')
        return None

    start = _parse_datetime(card.get('date_text', ''), card.get('time_text', ''))
    if not start:
        logging.warning(f'Skipping Bio Connect event without date: {title}')
        return None

    # Skip clearly past events
    try:
        if datetime.fromisoformat(start) < datetime.now(pytz.utc) - timedelta(hours=6):
            return None
    except Exception:
        pass

    try:
        end = (datetime.fromisoformat(start) + timedelta(hours=3)).isoformat()
    except Exception:
        end = start

    event_id = f"evt_nybio_{hashlib.md5(f'{title}{start}'.encode()).hexdigest()[:8]}"
    categories = card.get('industries') or ['Biotech', 'Life Sciences']
    return {
        'id': event_id,
        'name': title,
        'type': 'Tech',
        'locationId': '',
        'communityId': COMMUNITY_ID,
        'description': card.get('description') or '',
        'startDate': start,
        'endDate': end,
        'category': categories[:6],
        'price': {
            'amount': 0,
            'type': 'Paid',
            'currency': 'USD',
            'details': 'See registration link for pricing',
        },
        'capacity': None,
        'registrationRequired': True,
        'tags': ['biotech', 'life sciences', 'nyc'],
        'image': '',
        'status': 'upcoming',
        'metadata': {
            'source': 'New York Bio Connect',
            'source_url': card.get('url') or LISTING_URL,
            'organizer': {
                'name': 'New York Bio Connect',
                'website': BASE_URL,
            },
            'venue': {
                'name': 'NYC',
                'address': 'New York, NY',
                'type': card.get('event_type') or 'Event Venue',
            },
            'featured': (card.get('status') or '').lower() in ('coming up', 'new'),
            'event_format': card.get('event_type') or '',
            'industries': card.get('industries') or [],
        },
    }


def main() -> Optional[str]:
    os.makedirs(DATA_DIR, exist_ok=True)
    seen: Set[str] = set()
    cards: List[Dict] = []

    page = 1
    while page <= 5:
        url = LISTING_URL if page == 1 else f'{BASE_URL}/events/page/{page}/?region=nyc'
        logging.info(f'Fetching Bio Connect events: {url}')
        html = _fetch(url)
        page_cards = _extract_cards(html)
        if not page_cards:
            break
        new_count = 0
        for card in page_cards:
            key = (card.get('url') or '') + '|' + (card.get('name') or '')
            if key in seen:
                continue
            seen.add(key)
            cards.append(card)
            new_count += 1
        if new_count == 0:
            break
        # Stop if no pagination signal
        if f'/events/page/{page + 1}/' not in html and page > 1:
            break
        if page == 1 and '/events/page/2/' not in html:
            break
        page += 1

    events = []
    for card in cards:
        converted = convert_card(card)
        if converted:
            events.append(converted)
    events.sort(key=lambda e: e.get('startDate') or '')

    output_file = os.path.join(DATA_DIR, 'ny_bio_connect_events.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({'events': events}, f, indent=2, ensure_ascii=False)
    logging.info(f'Saved {len(events)} New York Bio Connect events to {output_file}')
    return output_file


if __name__ == '__main__':
    main()
