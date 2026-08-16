"""Scrape upcoming events from boshi's place (https://boshis.place/events/)."""

from __future__ import annotations

import hashlib
import json
import logging
import os
import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from urllib.parse import urljoin

import pytz
import requests
from bs4 import BeautifulSoup

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(SCRIPT_DIR))
DATA_DIR = os.path.join(PROJECT_ROOT, 'data', 'scrapers')

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

BASE_URL = 'https://boshis.place'
EVENTS_URL = f'{BASE_URL}/events/'
COMMUNITY_ID = 'com_boshis'
LOCATION_ID = 'loc_boshis'
NY_TZ = pytz.timezone('America/New_York')
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
}


def _fetch(url: str) -> str:
    response = requests.get(url, headers=HEADERS, timeout=30)
    response.raise_for_status()
    return response.text


def _parse_detail_datetime(text: str) -> Optional[str]:
    """Parse strings like 'Friday, August 21, 2026 @ 7:00 PM EDT'."""
    if not text:
        return None
    cleaned = re.sub(r'\s+', ' ', text).strip()
    cleaned = re.sub(r'\s+@\s+', ' ', cleaned)
    cleaned = re.sub(r'\s+(EDT|EST|UTC|GMT)$', '', cleaned, flags=re.I)
    for fmt in (
        '%A, %B %d, %Y %I:%M %p',
        '%B %d, %Y %I:%M %p',
        '%A, %B %d, %Y %I %p',
        '%B %d, %Y',
    ):
        try:
            dt = datetime.strptime(cleaned, fmt)
            if '%I' not in fmt and '%H' not in fmt:
                dt = dt.replace(hour=19, minute=0)
            return NY_TZ.localize(dt).astimezone(pytz.utc).isoformat()
        except ValueError:
            continue
    return None


def _parse_list_date(date_text: str, poster_alt: str = '') -> Optional[str]:
    """Fallback when detail page fetch fails: list date + time from poster alt."""
    if not date_text:
        return None
    start_iso = _parse_detail_datetime(date_text)
    if not start_iso:
        return None
    # Prefer time from poster alt: "friday 8/21, 7pm to 9pm"
    alt = poster_alt or ''
    match = re.search(r'(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*to\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))', alt, re.I)
    if match:
        day = datetime.fromisoformat(start_iso).astimezone(NY_TZ).strftime('%Y-%m-%d')
        start_local = _parse_detail_datetime(f"{day} {match.group(1).upper().replace(' ', '')}")
        # above may fail; try with space
        if not start_local:
            raw = match.group(1).lower().replace(' ', '')
            raw = re.sub(r'(\d)([ap]m)', r'\1 \2', raw)
            try:
                t = datetime.strptime(raw, '%I:%M %p' if ':' in raw else '%I %p')
                base = datetime.fromisoformat(start_iso).astimezone(NY_TZ).replace(
                    hour=t.hour, minute=t.minute, second=0, microsecond=0
                )
                start_local = base.astimezone(pytz.utc).isoformat()
            except ValueError:
                start_local = start_iso
        return start_local or start_iso
    return start_iso


def _enrich_from_detail(path: str) -> Dict:
    url = urljoin(BASE_URL, path)
    try:
        soup = BeautifulSoup(_fetch(url), 'html.parser')
    except Exception as exc:
        logging.warning(f'Could not fetch Boshi detail {url}: {exc}')
        return {'url': url}

    date_el = None
    for sel in ['[class*=date]', 'time', 'h2', 'h3']:
        for el in soup.select(sel):
            text = el.get_text(' ', strip=True)
            if re.search(r'20\d{2}', text) and ('PM' in text.upper() or 'AM' in text.upper() or '@' in text):
                date_el = text
                break
        if date_el:
            break

    desc = ''
    for sel in ['.Event-description', '.EventCard-text', 'main p', 'article p']:
        el = soup.select_one(sel)
        if el:
            text = el.get_text(' ', strip=True)
            if len(text) > 40:
                desc = text
                break

    return {
        'url': url,
        'datetime_text': date_el or '',
        'description': desc,
        'startDate': _parse_detail_datetime(date_el or ''),
    }


def scrape_upcoming_cards(html: str) -> List[Dict]:
    soup = BeautifulSoup(html, 'html.parser')
    cards: List[Dict] = []
    mode = None
    for el in soup.find_all(['h1', 'article']):
        if el.name == 'h1':
            title = el.get_text(' ', strip=True).lower()
            if 'upcoming' in title:
                mode = 'upcoming'
            elif 'past' in title:
                mode = 'past'
            continue
        if el.name != 'article' or 'EventCard' not in (el.get('class') or []):
            continue
        if mode != 'upcoming':
            continue
        if 'Cancelled' in el.get_text(' ', strip=True):
            continue

        name_el = el.select_one('.EventCard-name')
        date_el = el.select_one('.EventCard-date')
        text_el = el.select_one('.EventCard-text')
        anchor = el.select_one('a.EventCard-anchor')
        img = el.select_one('.EventCard-posterFrame img')
        href = anchor.get('href') if anchor else ''
        cards.append({
            'name': name_el.get_text(strip=True) if name_el else 'Boshi\'s Event',
            'date_text': date_el.get_text(strip=True) if date_el else '',
            'description': text_el.get_text(' ', strip=True) if text_el else '',
            'href': href,
            'image': urljoin(BASE_URL, img.get('src')) if img and img.get('src') else '',
            'poster_alt': img.get('alt') if img else '',
        })
    return cards


def convert_card(card: Dict) -> Optional[Dict]:
    detail = _enrich_from_detail(card['href']) if card.get('href') else {'url': EVENTS_URL}
    start = detail.get('startDate') or _parse_list_date(card.get('date_text', ''), card.get('poster_alt', ''))
    if not start:
        logging.warning(f"Skipping Boshi event without date: {card.get('name')}")
        return None

    # Default 2-hour duration when end unknown
    try:
        end = (datetime.fromisoformat(start) + timedelta(hours=2)).isoformat()
    except Exception:
        end = start

    # Poster alt often has "free/donation"
    alt = (card.get('poster_alt') or '').lower()
    price = {
        'amount': 0,
        'type': 'Free',
        'currency': 'USD',
        'details': 'Free / donation' if 'donation' in alt or 'free' in alt else 'See event page',
    }

    title = card['name']
    event_id = f"evt_boshis_{hashlib.md5(f'{title}{start}'.encode()).hexdigest()[:8]}"
    description = detail.get('description') or card.get('description') or ''

    return {
        'id': event_id,
        'name': title,
        'type': 'Creative',
        'locationId': LOCATION_ID,
        'communityId': COMMUNITY_ID,
        'description': description,
        'startDate': start,
        'endDate': end,
        'category': ['Arts', 'Community', 'Games'],
        'price': price,
        'capacity': None,
        'registrationRequired': False,
        'tags': ['boshi', 'brooklyn'],
        'image': card.get('image') or '',
        'status': 'upcoming',
        'metadata': {
            'source': "Boshi's Place",
            'source_url': detail.get('url') or urljoin(BASE_URL, card.get('href') or '/events/'),
            'organizer': {
                'name': "Boshi's Place",
                'website': BASE_URL,
                'instagram': '@boshisplace',
                'email': 'hello@boshis.place',
            },
            'venue': {
                'name': "Boshi's Place",
                'address': '1002 Metropolitan Ave, Brooklyn, NY 11211',
                'type': 'Community Space',
            },
            'featured': False,
        },
    }


def main() -> Optional[str]:
    os.makedirs(DATA_DIR, exist_ok=True)
    logging.info(f'Fetching Boshi events from {EVENTS_URL}')
    html = _fetch(EVENTS_URL)
    cards = scrape_upcoming_cards(html)
    logging.info(f'Found {len(cards)} upcoming Boshi event cards')

    events = []
    for card in cards:
        converted = convert_card(card)
        if converted:
            events.append(converted)

    output_file = os.path.join(DATA_DIR, 'boshis_events.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({'events': events}, f, indent=2, ensure_ascii=False)
    logging.info(f'Saved {len(events)} Boshi events to {output_file}')
    return output_file


if __name__ == '__main__':
    main()
