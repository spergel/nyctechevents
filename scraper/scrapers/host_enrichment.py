"""Derive soft communities + match known venues for Luma/unknown-host events."""

from __future__ import annotations

import logging
import re
from typing import Dict, List, Optional, Set

from .calendar_configs import ICS_CALENDARS, COMMUNITY_ID_ALIASES, HOST_NAME_TO_COMMUNITY_ID


def slugify_derived_community_id(name: str) -> str:
    slug = re.sub(r'[^a-z0-9]+', '_', (name or '').lower()).strip('_')
    return f"com_derived_{slug}" if slug else "com_derived_unknown"


def parse_ics_organizer_name(raw: str) -> str:
    """Pull a human name out of ICS ORGANIZER blobs."""
    if not raw:
        return ''
    text = str(raw)
    cn = re.search(r'CN=([^:;]+)', text, re.I)
    if cn:
        return cn.group(1).strip().strip('"')
    # mailto-only / noisy calendar-invite strings are not useful host labels
    if 'calendar-invite@' in text.lower() or text.lower().startswith('mailto:'):
        return ''
    if 'ORGANIZER' in text.upper():
        return ''
    return text.strip()


def ics_calendar_display_map() -> Dict[str, Dict[str, str]]:
    """community_id -> {name, website} for ICS calendars not in communities.json."""
    mapping: Dict[str, Dict[str, str]] = {}
    for cal in ICS_CALENDARS:
        community_id = cal.get('community_id')
        if not community_id:
            continue
        display = cal.get('display_name') or cal.get('name', '').replace('_', ' ').title()
        mapping[community_id] = {
            'name': display,
            'website': cal.get('website') or '',
        }
    return mapping


def match_location_id(
    venue_name: str,
    venue_address: str,
    locations: Dict[str, Dict],
) -> str:
    """Match venue text to a curated location id, or ''."""
    blob = f"{venue_name or ''} {venue_address or ''}".lower().strip()
    if not blob or blob.startswith('http'):
        return ''

    for loc_id, location in locations.items():
        name = (location.get('name') or '').lower().strip()
        address = (location.get('address') or '').lower().strip()
        if name and name in blob:
            return loc_id
        if address and address in blob:
            return loc_id
        # Match on street line without city/zip when present
        if address:
            street = address.split(',')[0].strip()
            if street and street in blob:
                return loc_id
    return ''


def build_derived_community(
    name: str,
    website: str = '',
    image: str = '',
    community_id: Optional[str] = None,
) -> Optional[Dict]:
    clean = (name or '').strip()
    if not clean:
        return None
    return {
        'id': community_id or slugify_derived_community_id(clean),
        'name': clean,
        'website': website or '',
        'image': image or '',
        'derived': True,
    }


def enrich_event_host_and_venue(
    event: Dict,
    locations: Dict[str, Dict],
    formal_community_ids: Set[str],
    calendar_names: Optional[Dict[str, Dict[str, str]]] = None,
) -> Dict:
    """
    Attach derived_community + locationId for events whose formal community
    is missing or whose venue matches a known location.

    Does not add entries to communities.json — derived hosts are event metadata
    for UI display only.
    """
    calendar_names = calendar_names or ics_calendar_display_map()
    metadata = event.setdefault('metadata', {})
    venue = metadata.setdefault('venue', {})
    community_id = event.get('communityId') or ''

    # Map scraper-only ids onto formal communities when we already have them
    alias = COMMUNITY_ID_ALIASES.get(community_id)
    if alias and alias in formal_community_ids:
        event['communityId'] = alias
        community_id = alias
        metadata.pop('derived_community', None)

    # Prefer already-scraped Luma host fields if present on metadata
    luma_host = metadata.get('luma_host') or {}
    host_name = ''
    host_website = ''
    host_image = ''

    def _is_personal_calendar_name(name: str) -> bool:
        n = (name or '').lower()
        return n.endswith("'s calendar") or n.endswith("’s calendar") or n.endswith(' calendar')

    # 1) Luma Organization calendar host (skip generic personal calendars)
    if (
        luma_host.get('type') == 'Organization'
        and luma_host.get('name')
        and not _is_personal_calendar_name(luma_host.get('name', ''))
    ):
        host_name = luma_host['name'].strip()
        host_website = (luma_host.get('url') or luma_host.get('website') or '').strip()
        host_image = (luma_host.get('image') or '').strip()

    # 2) Known ICS calendar display name (stable community label)
    if not host_name and community_id in calendar_names:
        host_name = calendar_names[community_id].get('name', '')
        host_website = host_website or calendar_names[community_id].get('website', '')

    # 3) Any luma host name (may be a person / personal calendar)
    if not host_name and luma_host.get('name'):
        host_name = luma_host['name'].strip()
        host_website = host_website or (luma_host.get('url') or '').strip()
        host_image = host_image or (luma_host.get('image') or '').strip()

    # 4) Cleaned ICS/Google organizer (skip raw ORGANIZER blobs)
    if not host_name:
        organizer = metadata.get('organizer') or {}
        host_name = parse_ics_organizer_name(organizer.get('name') or '')
        host_website = host_website or (organizer.get('website') or '')

    formal = community_id in formal_community_ids
    if formal:
        metadata.pop('derived_community', None)
    elif host_name:
        derived = build_derived_community(
            host_name,
            website=host_website,
            image=host_image,
            community_id=community_id if community_id.startswith('com_') else None,
        )
        if derived:
            # Keep scraper community_id stable; mark derived for UI fallback
            metadata['derived_community'] = derived
            # Clean organizer for display
            metadata['organizer'] = {
                **(metadata.get('organizer') or {}),
                'name': host_name,
                'website': host_website or (metadata.get('organizer') or {}).get('website', ''),
            }

    # Match known venue → locationId
    venue_name = (venue.get('name') or '').strip()
    venue_address = (venue.get('address') or '').strip()
    if venue_name.startswith('http'):
        venue_name = ''
    if venue_address.startswith('http'):
        venue_address = ''

    existing_loc = event.get('locationId') or ''
    if existing_loc and existing_loc in locations:
        loc_id = existing_loc
    else:
        loc_id = match_location_id(venue_name, venue_address, locations)
        # Soft defaults for communities whose venue names vary (e.g. Index Greenpoint)
        if not loc_id:
            defaults = {
                'com_index': 'loc_index',
                'com_pioneer_works': 'loc_pioneer_works',
            }
            loc_id = defaults.get(community_id, '')
        if loc_id:
            event['locationId'] = loc_id

    if loc_id and loc_id in locations:
        location = locations[loc_id]
        if not venue_name:
            venue['name'] = location.get('name', '')
        if not venue_address:
            venue['address'] = location.get('address', '')
        if not venue.get('type'):
            venue['type'] = location.get('type', 'Venue')

        # If guest community hosts at a known community venue, surface venue community
        main_community = location.get('mainCommunityId')
        if main_community and main_community != community_id:
            associated = list(metadata.get('associated_communities') or [])
            if main_community not in associated:
                associated.append(main_community)
            metadata['associated_communities'] = associated

    # Link overlapping Luma co-hosts (e.g. ATIH + CHT + BrainStation) via known org names
    associated = list(metadata.get('associated_communities') or [])
    cohost_names = []
    for host in metadata.get('luma_hosts') or []:
        if isinstance(host, dict) and host.get('name'):
            cohost_names.append(host['name'])
    if luma_host.get('name'):
        cohost_names.append(luma_host['name'])
    for name in cohost_names:
        mapped = HOST_NAME_TO_COMMUNITY_ID.get((name or '').strip().lower())
        if mapped and mapped in formal_community_ids and mapped != community_id and mapped not in associated:
            associated.append(mapped)
    if associated:
        metadata['associated_communities'] = associated

    return event


def enrich_events(
    events: List[Dict],
    locations: Dict[str, Dict],
    formal_community_ids: Set[str],
) -> List[Dict]:
    calendar_names = ics_calendar_display_map()
    enriched = 0
    for event in events:
        before = (
            event.get('locationId'),
            (event.get('metadata') or {}).get('derived_community'),
            (event.get('metadata') or {}).get('associated_communities'),
        )
        enrich_event_host_and_venue(event, locations, formal_community_ids, calendar_names)
        after = (
            event.get('locationId'),
            (event.get('metadata') or {}).get('derived_community'),
            (event.get('metadata') or {}).get('associated_communities'),
        )
        if before != after:
            enriched += 1
    logging.info(f"Enriched host/venue metadata on {enriched} events")
    return events
