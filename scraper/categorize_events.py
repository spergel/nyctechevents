import json
import os
from typing import Dict, List, Tuple
import logging
from tqdm import tqdm
import requests
from datetime import datetime, timedelta
import argparse
import sys
from collections import defaultdict
import re
import unicodedata
import traceback

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.FileHandler('categorizer.log'), logging.StreamHandler()]
)

# Define categories with a clearer hierarchy and refined keywords
CATEGORIES = {
    # Primary Types
    "Tech": {
        "keywords": ["tech", "software", "hardware", "developer", "engineer", "data", "ai", "ml", "startup", "product", "design", "ux", "ui", "cybersecurity", "blockchain", "crypto"],
        "subcategories": {
            "Talk/Conference": ["talk", "conference", "seminar", "presentation", "panel", "keynote", "summit"],
            "Workshop/Training": ["workshop", "training", "bootcamp", "class", "course", "lab", "learn", "study group"],
            "Hackathon/Competition": ["hackathon", "competition", "challenge", "game jam", "datathon", "contest"],
            "Networking/Social": ["networking", "mixer", "social", "meetup", "community", "gathering", "happy hour"],
            "Startup/Business": ["startup", "entrepreneur", "founder", "investor", "pitch", "venture", "business", "demo day"],
        }
    },
    "Art & Culture": {
        "keywords": ["art", "culture", "music", "gallery", "exhibition", "performance", "film", "screening", "theater", "dance", "museum"],
        "subcategories": {
            "Exhibition": ["exhibition", "gallery", "show", "installation", "art show"],
            "Performance": ["performance", "concert", "recital", "play", "theater", "dance"],
            "Screening": ["film", "screening", "movie"],
            "Cultural Event": ["culture", "heritage", "festival"],
        }
    },
    "Academic": {
        "keywords": ["academic", "lecture", "symposium", "university", "college", "research", "scholar", "thesis"],
        "subcategories": {
            "Lecture": ["lecture", "seminar", "talk"],
            "Conference": ["symposium", "conference", "colloquium"],
        }
    },
    "Community & Civic": {
        "keywords": ["community", "civic", "volunteer", "neighborhood", "public", "government", "non-profit"],
        "subcategories": {}
    }
}

# Normalize all keywords to lowercase for case-insensitive matching
for category, data in CATEGORIES.items():
    data["keywords"] = [k.lower() for k in data["keywords"]]
    if "subcategories" in data:
        for subcat, keywords in data["subcategories"].items():
            data["subcategories"][subcat] = [k.lower() for k in keywords]

def normalize_text(text):
    """Lowercase and remove punctuation for matching."""
    if not text:
        return ""
    return re.sub(r'[^\w\s]', '', text.lower())
        
# Load community and location data
def load_auxiliary_data():
    """Load community and location data for enhanced categorization"""
    communities = {}
    locations = {}
    
    try:
        # Get the current directory path (scraper/)
        current_dir = os.path.dirname(os.path.abspath(__file__))
        # Navigate up one level to get the project root
        root_dir = os.path.dirname(current_dir)
        
        # Construct paths to the auxiliary data files
        communities_file = os.path.join(root_dir, 'public', 'data', 'communities.json')
        locations_file = os.path.join(root_dir, 'public', 'data', 'locations.json')
        
        logging.info(f"Looking for communities file at: {communities_file}")
        
        # Load communities data
        with open(communities_file, 'r', encoding='utf-8') as f:
            communities_data = json.load(f)
            communities = {com['id']: com for com in communities_data.get('communities', [])}
            
        # Load locations data
        with open(locations_file, 'r', encoding='utf-8') as f:
            locations_data = json.load(f)
            locations = {loc['id']: loc for loc in locations_data.get('locations', [])}
    except Exception as e:
        logging.warning(f"Could not load auxiliary data: {str(e)}")
    
    return communities, locations

class EventCategorizer:
    def __init__(self):
        """Initialize the event categorizer"""
        self.categories = CATEGORIES
        self.communities, self.locations = load_auxiliary_data()
        
    def determine_event_type(self, event):
        """Determine the primary event type and subcategory."""
        name = normalize_text(event.get('name', ''))
        description = normalize_text(event.get('description', ''))
        text_to_search = f"{name} {description}"

        scores = defaultdict(lambda: defaultdict(int))
        
        # Score based on keywords
        for cat_name, cat_data in self.categories.items():
            for keyword in cat_data["keywords"]:
                if keyword in text_to_search:
                    scores[cat_name]["main"] += 1
            for subcat_name, subcat_keywords in cat_data.get("subcategories", {}).items():
                for keyword in subcat_keywords:
                    if keyword in text_to_search:
                        scores[cat_name][subcat_name] += 1
        
        # Determine primary type
        if not scores:
            return "General", None # Default if no keywords match

        primary_type = max(scores, key=lambda k: scores[k]["main"])
        
        # Determine subcategory
        subcategory = None
        # Remove the 'main' score to find the best subcategory
        sub_scores = {k: v for k, v in scores[primary_type].items() if k != "main"}
        if sub_scores and max(sub_scores.values()) > 0:
            subcategory = max(sub_scores, key=sub_scores.get)
            
        return primary_type, subcategory

    def categorize_event(self, event):
        """Categorize an event based on its content"""
        primary_type, subcategory = self.determine_event_type(event)
        
        event['type'] = primary_type
        event['category'] = {
            'id': subcategory.lower().replace(' ', '_') if subcategory else "general",
            'name': subcategory if subcategory else "General"
        }
        
        return event

    def _prepare_text_for_analysis(self, event):
        """Prepare event text for analysis"""
        text_parts = [
            event.get('name', ''),
            event.get('description', ''),
            event.get('organizer', {}).get('name', '') if isinstance(event.get('organizer'), dict) else '',
            event.get('venue', {}).get('name', '') if isinstance(event.get('venue'), dict) else ''
        ]
        
        # Add speaker names if available
        speakers = event.get('speakers', [])
        if speakers and isinstance(speakers, list):
            for speaker in speakers:
                if isinstance(speaker, dict):
                    text_parts.append(speaker.get('name', ''))
                elif isinstance(speaker, str):
                    text_parts.append(speaker)
            
        return ' '.join(filter(None, text_parts))

    def _get_category_predictions(self, text):
        """Get category predictions with confidence scores based on keyword matching"""
        predictions = []
        
        for cat_id, cat_data in self.categories.items():
            # Calculate keyword matches
            match_count = 0
            total_keywords = len(cat_data['keywords'])
            
            for keyword in cat_data['keywords']:
                if keyword.lower() in text:
                    match_count += 1
            
            # Calculate confidence based on percentage of matching keywords
            if total_keywords > 0 and match_count > 0:
                confidence = round(match_count / total_keywords, 3)
                predictions.append((cat_id, confidence))
                
        return sorted(predictions, key=lambda x: x[1], reverse=True)

def load_events(file_path: str) -> List[Dict]:
    """Load events from a JSON file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            # Handle both direct event lists and nested event lists
            if isinstance(data, list):
                return data
            elif isinstance(data, dict) and 'events' in data:
                return data['events']
            else:
                logging.warning(f"Unexpected data format in {file_path}")
                return []
    except Exception as e:
        logging.error(f"Error loading {file_path}: {str(e)}")
        return []

def save_categorized_events(events: List[Dict], output_path: str):
    """Save categorized events to a JSON file"""
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump({'events': events}, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logging.error(f"Error saving to {output_path}: {str(e)}")

def geocode_location(address: str) -> Tuple[float, float]:
    """Geocode an address using a geocoding service (OpenStreetMap Nominatim)"""
    try:
        url = f"https://nominatim.openstreetmap.org/search?format=json&q={address}"
        # Add a User-Agent header to identify your application.  Replace 'YourAppName'
        # and 'your_email@example.com' with appropriate values.
        headers = {
            'User-Agent': 'YourAppName/1.0 (your_email@example.com)'
        }
        response = requests.get(url, headers=headers)
        response.raise_for_status()  # Raise an exception for bad status codes
        data = response.json()
        
        if data:
            lat = float(data[0]['lat'])
            lon = float(data[0]['lon'])
            return lat, lon
        else:
            return None, None
    except requests.exceptions.RequestException as e:
        logging.error(f"Geocoding error for {address}: {e}")
        return None, None
    except (IndexError, KeyError, ValueError) as e:
        logging.error(f"Error parsing geocoding response for {address}: {e}")
        return None, None

def generate_locations_from_events(events: List[Dict], existing_locations: Dict) -> Tuple[Dict, Dict]:
    """
    Generate location entries from events that don't have location IDs.
    Returns:
    - Dict of new locations
    - Dict mapping venue signatures to location IDs
    """
    venue_to_location = {}  # Maps venue signature to location ID
    new_locations = {}
    next_location_num = 1
    
    # First, map existing locations to their venue signatures
    for loc_id, location in existing_locations.items():
        venue_sig = f"{location['name'].lower()}_{location['address'].lower()}"
        venue_to_location[venue_sig] = loc_id
    
    # Process each event
    for event in events:
        # Skip if event already has a valid location ID
        if event.get('locationId') and event['locationId'] in existing_locations:
            continue
            
        # Get venue details from metadata
        venue = event.get('metadata', {}).get('venue', {})
        venue_name = venue.get('name', '').strip()
        venue_address = venue.get('address', '').strip()
        
        # Skip if no venue information
        if not venue_name and not venue_address:
            continue
            
        # Create venue signature for deduplication
        venue_sig = f"{venue_name.lower()}_{venue_address.lower()}"
        
        # Skip if we already have this venue
        if venue_sig in venue_to_location:
            event['locationId'] = venue_to_location[venue_sig]
            continue
            
        # Generate new location ID
        new_loc_id = f"loc_auto_{next_location_num}"
        next_location_num += 1
        
        # Create new location entry
        new_location = {
            "id": new_loc_id,
            "name": venue_name,
            "type": "Venue",  # Default type
            "address": venue_address,
            "coordinates": {
                "lat": None,
                "lng": None
            },
            "description": "",
            "amenities": [],
            "capacity": "Small",  # Default capacity
            "accessibility": True,  # Default accessibility
            "website": "",
            "images": [],
            "hours": {
                "monday": "By appointment",
                "tuesday": "By appointment",
                "wednesday": "By appointment",
                "thursday": "By appointment",
                "friday": "By appointment",
                "saturday": "By appointment",
                "sunday": "By appointment"
            }
        }
        
        # Store new location
        new_locations[new_loc_id] = new_location
        venue_to_location[venue_sig] = new_loc_id
        
        # Update event with new location ID
        event['locationId'] = new_loc_id
    
    return new_locations, venue_to_location

def deduplicate_events(events: List[Dict]) -> List[Dict]:
    """
    Deduplicate events based on Luma URLs, identical event details, or matching against existing events.
    For duplicate events, preserve both location and community information.
    """
    logging.info("\n=== Starting Event Deduplication ===")
    
    # Filter out events without a name or with a blank name
    original_count = len(events)
    # Be less aggressive - only filter out completely empty or None names
    events = [event for event in events if event.get('name') and event.get('name').strip() and event.get('name').strip() != '']
    if original_count > len(events):
        logging.info(f"Filtered out {original_count - len(events)} events without a valid name")
    
    # Create a unique event identifier based on name, date, and community
    event_signatures = set()
    deduplicated_by_signature = []
    
    for event in events:
        name = event.get('name', '').strip().lower() if event.get('name') else ''
        start_date = event.get('startDate', '') if event.get('startDate') else ''
        community_id = event.get('communityId', '') if event.get('communityId') else ''
        
        # Create a signature for this event
        signature = f"{name}_{start_date}_{community_id}"
        
        # If we haven't seen this signature before, keep the event
        if signature not in event_signatures:
            event_signatures.add(signature)
            deduplicated_by_signature.append(event)
        
    logging.info(f"Removed {len(events) - len(deduplicated_by_signature)} events based on name/date/community signature")
    events = deduplicated_by_signature
    
    # Group events by their Luma URL if available
    events_by_luma_url = {}
    events_without_luma = []
    
    # Step 1: Separate events with Luma URLs from those without
    for event in events:
        luma_url = None
        
        # Check for Luma URL in metadata
        if event.get('metadata') and 'source_url' in event['metadata']:
            source_url = event['metadata']['source_url']
            if isinstance(source_url, str) and 'lu.ma' in source_url:
                luma_url = source_url
        
        # If we found a Luma URL, add to grouped events
        if luma_url:
            if luma_url not in events_by_luma_url:
                events_by_luma_url[luma_url] = []
            events_by_luma_url[luma_url].append(event)
        else:
            events_without_luma.append(event)
    
    # Step 2: Handle events with Luma URLs - merge duplicates
    deduplicated_events = []
    
    for luma_url, event_group in events_by_luma_url.items():
        if len(event_group) == 1:
            # No duplicates for this URL
            deduplicated_events.append(event_group[0])
        else:
            # Log details of duplicate events
            logging.info(f"\nFound {len(event_group)} duplicate events with URL: {luma_url}")
            for idx, event in enumerate(event_group, 1):
                logging.info(f"\nDuplicate #{idx}:")
                logging.info(f"  Title: {ensure_ascii_safe(event.get('name', 'N/A'))}")
                logging.info(f"  Community ID: {ensure_ascii_safe(event.get('communityId', 'N/A'))}")
                logging.info(f"  Location: {ensure_ascii_safe(event.get('locationId', 'N/A'))}")
                logging.info(f"  Source: {ensure_ascii_safe(event.get('source', 'N/A'))}")
                if event.get('metadata'):
                    logging.info(f"  Organizer: {ensure_ascii_safe(event['metadata'].get('organizer', 'N/A'))}")
                    if 'speakers' in event['metadata']:
                        speakers = [ensure_ascii_safe(s.get('name', 'N/A')) for s in event['metadata']['speakers']]
                        logging.info(f"  Speakers: {', '.join(speakers)}")
            
            # Merge duplicate events
            merged_event = merge_duplicate_events(event_group)
            deduplicated_events.append(merged_event)
    
    # Add events without Luma URLs
    deduplicated_events.extend(events_without_luma)
    
    # Final step: Check against existing events in the data file to prevent infinite duplicates
    try:
        existing_events = []
        # After move, __file__ is in 'scraper' dir. Data is in 'scraper/data'.
        current_script_dir = os.path.dirname(os.path.abspath(__file__))
        existing_events_path = os.path.join(current_script_dir, 'data', 'all_events_categorized.json')
        
        if os.path.exists(existing_events_path):
            with open(existing_events_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                existing_events = data.get('events', [])
            
            logging.info(f"Loaded {len(existing_events)} existing events for deduplication check")
            
            # Create signatures for existing events
            existing_signatures = set()
            for event in existing_events:
                name = event.get('name', '').strip().lower() if event.get('name') else ''
                start_date = event.get('startDate', '') if event.get('startDate') else ''
                community_id = event.get('communityId', '') if event.get('communityId') else ''
                signature = f"{name}_{start_date}_{community_id}"
                existing_signatures.add(signature)
            
            # Filter out events that already exist
            final_events = []
            for event in deduplicated_events:
                name = event.get('name', '').strip().lower() if event.get('name') else ''
                start_date = event.get('startDate', '') if event.get('startDate') else ''
                community_id = event.get('communityId', '') if event.get('communityId') else ''
                signature = f"{name}_{start_date}_{community_id}"
                
                if signature not in existing_signatures:
                    final_events.append(event)
            
            logging.info(f"Removed {len(deduplicated_events) - len(final_events)} events that already exist in the database")
            deduplicated_events = final_events
    except Exception as e:
        logging.warning(f"Error checking against existing events: {str(e)}")
        logging.warning("Proceeding with deduplicated events without checking against existing database")
    
    logging.info(f"\n=== Deduplication Summary ===")
    logging.info(f"Total events before deduplication: {original_count}")
    logging.info(f"Total events after deduplication: {len(deduplicated_events)}")
    logging.info(f"Number of duplicate groups found: {len([g for g in events_by_luma_url.values() if len(g) > 1])}")
    logging.info("=====================================\n")
    return deduplicated_events

def merge_duplicate_events(event_group: List[Dict]) -> Dict:
    """
    Merge duplicate events into a single event.
    Use primary community for ownership but secondary community's location.
    """
    # Use the first event as the base
    merged_event = event_group[0].copy()
    
    logging.info("\nMerging events:")
    
    # Collect all unique community IDs
    all_communities = list(set(e.get('communityId') for e in event_group if e.get('communityId')))
    
    # Map of community IDs to a priority score 
    hosting_communities = {
        "com_fractal": 1,
        "com_telos": 1,
        "com_sidequest": 1,
        # Add other known hosting communities here
    }
    
    # Sort communities by priority (lower score = higher priority)
    communities_with_priority = [(c, hosting_communities.get(c, 10)) for c in all_communities]
    communities_with_priority.sort(key=lambda x: x[1])
    
    # Get primary (host) community
    primary_community_id = communities_with_priority[0][0] if communities_with_priority else merged_event.get('communityId')
    
    # Get associated communities (all except primary)
    associated_communities = [c for c, _ in communities_with_priority if c != primary_community_id]
    
    logging.info(f"  Primary Community: {ensure_ascii_safe(primary_community_id)}")
    logging.info(f"  Associated Communities: {', '.join([ensure_ascii_safe(c) for c in associated_communities]) if associated_communities else 'None'}")
    
    # Initialize or update metadata
    if 'metadata' not in merged_event:
        merged_event['metadata'] = {}
    
    # Store community information
    merged_event['communityId'] = primary_community_id
    merged_event['metadata']['associated_communities'] = associated_communities
    
    # Special case handling for events hosted by one community but taking place at another
    # For example, SideQuest events at Fractal
    if "com_sidequest" in all_communities and "com_fractal" in all_communities:
        # If this is a SideQuest event at Fractal, make SideQuest the primary community
        merged_event['communityId'] = "com_sidequest"
        associated_communities = [c for c in all_communities if c != "com_sidequest"]
        merged_event['metadata']['associated_communities'] = associated_communities
        
        # Use Fractal's location if available
        merged_event['locationId'] = "loc_fractal"
        for event in event_group:
            if event.get('communityId') == "com_fractal" and event.get('metadata', {}).get('venue'):
                merged_event['metadata']['venue'] = event['metadata']['venue']
                logging.info(f"  Using Fractal's location for SideQuest event: loc_fractal")
                break
    
    # Ensure Fractal events always use loc_fractal
    elif "com_fractal" in all_communities:
        merged_event['locationId'] = "loc_fractal"
        logging.info(f"  Ensuring Fractal event uses loc_fractal")
    
    # For other hosting communities, use their location if available
    elif primary_community_id in hosting_communities:
        # Find the event with the primary community ID and use its location
        for event in event_group:
            if event.get('communityId') == primary_community_id and event.get('locationId'):
                merged_event['locationId'] = event['locationId']
                if event.get('metadata', {}).get('venue'):
                    merged_event['metadata']['venue'] = event['metadata']['venue']
                logging.info(f"  Using location from hosting community {primary_community_id}: {event['locationId']}")
                break
    
    # Use location from secondary community's event if available and no hosting location was found
    elif associated_communities:
        for event in event_group:
            if event.get('communityId') in associated_communities and event.get('locationId'):
                merged_event['locationId'] = event['locationId']
                if event.get('metadata', {}).get('venue'):
                    merged_event['metadata']['venue'] = event['metadata']['venue']
                logging.info(f"  Using location from secondary community: {event['locationId']}")
                break
    
    # Collect organizers from all events
    organizers = []
    for event in event_group:
        if event.get('metadata') and event['metadata'].get('organizer'):
            organizer = event['metadata']['organizer']
            if organizer not in organizers:
                organizers.append(organizer)
    
    if organizers:
        merged_event['metadata']['organizers'] = organizers
        # Log organizer names only
        organizer_names = [ensure_ascii_safe(org.get('name', 'Unknown')) for org in organizers]
        logging.info(f"  Organizers: {', '.join(organizer_names)}")
    
    # Remove any speaker duplicates
    if merged_event.get('metadata') and 'speakers' in merged_event['metadata']:
        speakers = merged_event['metadata']['speakers']
        seen_names = set()
        unique_speakers = []
        
        for speaker in speakers:
            name = speaker.get('name', '')
            if name and name not in seen_names:
                seen_names.add(name)
                unique_speakers.append(speaker)
        
        if len(speakers) != len(unique_speakers):
            logging.info(f"  Removed {len(speakers) - len(unique_speakers)} duplicate speakers")
            logging.info(f"  Final speakers: {', '.join(ensure_ascii_safe(s.get('name', 'N/A')) for s in unique_speakers)}")
                
        merged_event['metadata']['speakers'] = unique_speakers
    
    # Remove duplicate categories
    if 'category' in merged_event:
        original_categories = merged_event['category']
        merged_event['category'] = list(set(merged_event['category']))
        if len(original_categories) != len(merged_event['category']):
            logging.info(f"  Removed {len(original_categories) - len(merged_event['category'])} duplicate categories")
            logging.info(f"  Final categories: {', '.join(merged_event['category'])}")
    
    # Similar deduplication for social links
    if merged_event.get('metadata') and 'social_links' in merged_event['metadata']:
        original_links = merged_event['metadata']['social_links']
        merged_event['metadata']['social_links'] = list(set(merged_event['metadata']['social_links']))
        if len(original_links) != len(merged_event['metadata']['social_links']):
            logging.info(f"  Removed {len(original_links) - len(merged_event['metadata']['social_links'])} duplicate social links")
    
    logging.info("  Merge complete\n")
    return merged_event

def create_default_events() -> List[Dict]:
    """Create a set of default events if no events are found"""
    logging.info("No events found. Creating default events...")
    
    default_events = [
        {
            "id": f"evt_default_{i}",
            "name": name,
            "type": "Event",
            "locationId": "loc_tbd",
            "communityId": "com_default",
            "description": description,
            "startDate": (datetime.now() + timedelta(days=i*7)).isoformat(),
            "endDate": (datetime.now() + timedelta(days=i*7, hours=2)).isoformat(),
            "price": {
                "amount": price,
                "type": price_type,
                "currency": "USD",
                "details": ""
            },
            "capacity": 100,
            "registrationRequired": True,
            "image": "default-event.jpg",
            "status": "upcoming",
            "metadata": {
                "source_url": "",
                "speakers": [],
                "venue": {
                    "name": "TBD",
                    "address": "New York, NY",
                    "type": "Other"
                }
            }
        } for i, (name, description, price, price_type) in enumerate([
            (
                "Introduction to AI Workshop",
                "Learn the basics of artificial intelligence and machine learning in this hands-on workshop.",
                0, "Free"
            ),
            (
                "NYC Tech Networking Mixer",
                "Connect with fellow tech professionals in a casual networking environment.",
                10, "Paid"
            ),
            (
                "Startup Pitch Night",
                "Watch innovative startups pitch their ideas to potential investors.",
                15, "Paid"
            ),
            (
                "Web3 Developer Conference",
                "A full-day conference exploring the latest in blockchain and web3 development.",
                50, "Paid"
            ),
            (
                "Data Science Hackathon",
                "48-hour hackathon focused on solving real-world problems with data science.",
                0, "Free"
            )
        ])
    ]
    
    return default_events

def process_events(events):
    """Process and categorize events"""
    categorizer = EventCategorizer()
    processed_events = []
    stats = {
        'total': len(events),
        'tech': 0,
        'academic': 0,
        'performance': 0,
        'categories': defaultdict(int)
    }
    
    for event in events:
        # Remove unused fields
        event.pop('category', None)
        event.pop('tags', None)
        
        # Categorize event
        processed_event = categorizer.categorize_event(event)
        
        # Update statistics
        event_type = processed_event.get('type')
        stats[event_type] += 1
        
        if event_type == 'tech':
            if 'category' in processed_event:
                stats['categories'][processed_event['category']['id']] += 1
        
        processed_events.append(processed_event)
    
    # Log statistics
    logging.info(f"Processed {stats['total']} events:")
    logging.info(f"- Tech events: {stats['tech']}")
    logging.info(f"- Academic events: {stats['academic']}")
    logging.info(f"- Performance events: {stats['performance']}")
    
    if stats['tech'] > 0:
        logging.info("\nTop tech categories:")
        for cat_id, count in sorted(stats['categories'].items(), key=lambda x: x[1], reverse=True)[:5]:
            cat_name = CATEGORIES[cat_id]['name']
            logging.info(f"- {cat_name}: {count}")
    
    return processed_events

def main(input_file, output_file):
    """
    Main function to categorize events from an input file and save them to an output file.
    """
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        events = data.get('events', [])
        
        for event in events:
            # Assign a score-based category
            event['category'] = get_event_category(event)
        
        # Save categorized events
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        logging.info(f"Successfully categorized and saved {len(events)} events to {output_file}")
        
    except FileNotFoundError:
        logging.error(f"Input file not found: {input_file}")
    except json.JSONDecodeError:
        logging.error(f"Error decoding JSON from file: {input_file}")
    except Exception as e:
        logging.error(f"An error occurred during categorization: {e}")
        logging.error(traceback.format_exc())

def ensure_ascii_safe(text):
    """Ensure text is safely represented for logging, handling all Unicode characters.
    
    This function:
    1. Converts None to 'N/A'
    2. Replaces emojis with [emoji] 
    3. Handles any other Unicode encoding errors
    
    Returns a string safe for logging in any environment.
    """
    if text is None:
        return "N/A"
    
    try:
        # Convert to string if not already
        text = str(text)
        
        # Pattern to detect emoji characters
        emoji_pattern = re.compile(
            "["
            "\U0001F600-\U0001F64F"  # emoticons
            "\U0001F300-\U0001F5FF"  # symbols & pictographs
            "\U0001F680-\U0001F6FF"  # transport & map symbols
            "\U0001F700-\U0001F77F"  # alchemical symbols
            "\U0001F780-\U0001F7FF"  # Geometric Shapes
            "\U0001F800-\U0001F8FF"  # Supplemental Arrows-C
            "\U0001F900-\U0001F9FF"  # Supplemental Symbols and Pictographs
            "\U0001FA00-\U0001FA6F"  # Chess Symbols
            "\U0001FA70-\U0001FAFF"  # Symbols and Pictographs Extended-A
            "\U00002702-\U000027B0"  # Dingbats
            "\U000024C2-\U0001F251" 
            "]+"
        )
        
        # Replace emojis with placeholder
        text = emoji_pattern.sub("[emoji]", text)
        
        # Try to ensure it's ASCII safe
        return text
    except UnicodeEncodeError:
        # If still getting encode errors, try to normalize
        try:
            return unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('ascii')
        except:
            # Last resort: fully ASCII representation
            return repr(text)

def get_event_category(event):
    """
    Categorizes an event based on keywords in its summary and description.
    """
    summary = event.get('summary', '').lower()
    description = event.get('description', '').lower()
    event_text = summary + ' ' + description
    
    existing_category = event.get('category', {})
    if isinstance(existing_category, dict) and 'type' in existing_category and 'subCategory' in existing_category:
        return existing_category

    scores = {cat: 0 for cat in CATEGORIES}

    for category, details in CATEGORIES.items():
        for keyword in details['keywords']:
            if keyword in event_text:
                scores[category] += 1
    
    if any(score > 0 for score in scores.values()):
        best_category_name = max(scores, key=scores.get)
        best_category = CATEGORIES[best_category_name]
        
        # Find the best subcategory
        subcategory_scores = {}
        for subcat_name, subcat_keywords in best_category.get('subcategories', {}).items():
            subcategory_scores[subcat_name] = sum(1 for keyword in subcat_keywords if keyword in event_text)
        
        best_subcategory = max(subcategory_scores, key=subcategory_scores.get) if subcategory_scores and max(subcategory_scores.values()) > 0 else "General"
        
        return {
            "type": best_category_name,
            "subCategory": best_subcategory
        }
    
    return {
        "type": "General",
        "subCategory": "Community Event"
    }

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Categorize tech events')
    parser.add_argument('input_file', help='Input JSON file with events')
    parser.add_argument('output_file', help='Output JSON file for categorized events')
    args = parser.parse_args()
    
    main(args.input_file, args.output_file) 