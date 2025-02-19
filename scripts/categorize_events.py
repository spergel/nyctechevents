import json
import os
import torch
from transformers import BertTokenizer, BertModel
import numpy as np
from typing import Dict, List, Tuple
import logging
from tqdm import tqdm
import requests  # Import the requests library

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.FileHandler('categorizer.log'), logging.StreamHandler()]
)

# Load community and location data
def load_auxiliary_data():
    """Load community and location data for enhanced categorization"""
    communities = {}
    locations = {}
    
    try:
        with open('../data/communities.json', 'r', encoding='utf-8') as f:
            communities_data = json.load(f)
            communities = {com['id']: com for com in communities_data.get('communities', [])}
            
        with open('../data/locations.json', 'r', encoding='utf-8') as f:
            locations_data = json.load(f)
            locations = {loc['id']: loc for loc in locations_data.get('locations', [])}
    except Exception as e:
        logging.warning(f"Could not load auxiliary data: {str(e)}")
    
    return communities, locations

# Define categories
CATEGORIES = {
    "arts_culture": {
        "name": "Arts & Culture",
        "subcategories": [
            "galleries",  # gallery openings, art shows
            "museums",    # museum events, exhibitions
            "theater",    # plays, performances
            "music",      # concerts, live music
            "film",       # screenings, festivals
            "literature", # book launches, readings
            "dance"       # dance performances, classes
        ],
        "keywords": [
            "art", "exhibition", "gallery", "museum", "theater", "dance", "music", 
            "concert", "performance", "book", "reading", "poetry", "film", "screening",
            "author", "artist", "curator", "broadway", "off-broadway"
        ],
        "community_types": ["Cultural Community", "Cultural Institution", "Cultural Archive"],
        "location_types": ["Gallery", "Museum", "Theater", "Concert Hall", "Cinema"]
    },
    "farmers_market": {
        "name": "Farmers Market",
        "subcategories": [
            "greenmarket",     # greenmarkets
            "farmstand",       # farm stands
            "produce_market",  # fresh produce markets
            "seasonal_market"  # seasonal markets
        ],
        "keywords": [
            "farmers market", "greenmarket", "farm stand", "farmstand", "produce", 
            "fresh market", "local produce", "farm fresh", "seasonal market",
            "green market", "farm market", "fresh food", "local food", "organic market"
        ],
        "community_types": ["Food Community", "Market"],
        "location_types": ["Market", "Outdoor Market"]
    },
    "community_neighborhood": {
        "name": "Community & Neighborhood",
        "subcategories": [
            "street_fairs",     # street festivals, block parties
            "farmers_markets",  # greenmarkets, food markets
            "flea_markets",     # vintage, craft markets
            "civic_meetings",   # community board, town halls
            "volunteer",        # cleanups, community service
            "cultural_celebrations"  # cultural festivals, parades
        ],
        "keywords": [
            "community", "neighborhood", "street fair", "block party", "market", 
            "greenmarket", "flea", "local", "volunteer", "cleanup", "festival",
            "parade", "celebration", "cultural", "community board"
        ]
    },
    "parks_outdoors": {
        "name": "Parks & Outdoors",
        "subcategories": [
            "park_events",      # park programming
            "nature_walks",     # guided walks, bird watching
            "gardens",          # botanical gardens, community gardens
            "waterfront",       # waterfront activities
            "outdoor_fitness",  # outdoor exercise classes
            "outdoor_recreation" # sports, games
        ],
        "keywords": [
            "park", "garden", "outdoor", "nature", "hike", "walk", "waterfront", 
            "river", "beach", "trail", "botanical", "recreation", "fitness",
            "sports", "games", "playground", "conservancy"
        ]
    },
    "food_drink": {
        "name": "Food & Drink",
        "subcategories": [
            "tastings",         # food/drink tastings
            "pop_ups",          # pop-up restaurants/bars
            "food_festivals",   # food events/festivals
            "cooking_classes",  # cooking workshops
            "food_markets",     # specialty food markets
            "dining_events"     # special dining events
        ],
        "keywords": [
            "food", "drink", "dining", "restaurant", "bar", "pop-up", "tasting",
            "culinary", "chef", "cooking", "wine", "beer", "cocktail", "cafe",
            "bakery", "market", "festival"
        ]
    },
    "learning_workshops": {
        "name": "Learning & Workshops",
        "subcategories": [
            "classes",          # educational classes
            "workshops",        # hands-on workshops
            "talks",           # lectures, talks
            "skill_building",  # practical skills
            "professional_dev", # career development
            "tech_events"      # tech meetups, workshops
        ],
        "keywords": [
            "class", "workshop", "learn", "education", "talk", "lecture", "skill",
            "training", "professional", "development", "tech", "meetup", "seminar",
            "conference", "masterclass"
        ]
    },
    "family_youth": {
        "name": "Family & Youth",
        "subcategories": [
            "kids_activities",    # children's events
            "teen_programs",      # teen-specific
            "family_events",      # whole family
            "school_programs",    # educational
            "youth_sports",       # sports/recreation
            "storytime"          # reading events
        ],
        "keywords": [
            "family", "kids", "children", "youth", "teen", "parent", "baby", 
            "storytime", "playground", "school", "education", "camp", "after-school",
            "family-friendly"
        ]
    },
    "wellness_fitness": {
        "name": "Wellness & Fitness",
        "subcategories": [
            "fitness_classes",    # exercise classes
            "yoga",              # yoga/meditation
            "mental_health",     # wellness workshops
            "sports_leagues",    # recreational sports
            "running_groups",    # running events
            "skating",           # skating events
            "cycling",           # biking events
            "wellness_workshops" # health workshops
        ],
        "keywords": [
            "fitness", "wellness", "health", "yoga", "meditation", "exercise",
            "sports", "running", "workout", "gym", "training", "mindfulness",
            "mental health", "self-care", "skate", "skating", "roller", "bike",
            "cycling", "athletic", "physical", "active", "outdoor fitness"
        ]
    },
    "nightlife_social": {
        "name": "Nightlife & Social",
        "subcategories": [
            "bars_lounges",      # bar events
            "dance_parties",     # dance events
            "comedy",            # comedy shows
            "singles_events",    # dating/singles
            "game_nights",       # social games
            "social_clubs"       # club events
        ],
        "keywords": [
            "nightlife", "party", "bar", "club", "lounge", "dance", "dj", "comedy",
            "social", "singles", "dating", "games", "trivia", "karaoke", "mixer"
        ]
    }
}

class EventCategorizer:
    def __init__(self):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')
        self.model = BertModel.from_pretrained('bert-base-uncased').to(self.device)
        self.model.eval()
        
        # Load community and location data
        self.communities, self.locations = load_auxiliary_data()
        
        # Pre-compute category embeddings
        self.category_embeddings = {}
        for category, data in CATEGORIES.items():
            # Combine keywords and subcategories for better embeddings
            all_terms = data['keywords'] + [sub.replace('_', ' ') for sub in data['subcategories']]
            self.category_embeddings[category] = self._get_text_embedding(
                ' '.join(all_terms)
            )
            
        # Build community category mappings
        self.community_category_mappings = self._build_community_category_mappings()
    
    def _build_community_category_mappings(self):
        """Build mappings between community categories/tags and our event categories"""
        mappings = {}
        
        # Define category mappings
        category_map = {
            # Arts & Culture
            "Arts": "arts_culture",
            "Culture": "arts_culture",
            "Music": "arts_culture",
            "Performance": "arts_culture",
            "Theater": "arts_culture",
            "Dance": "arts_culture",
            "Literature": "arts_culture",
            
            # Community & Neighborhood
            "Community": "community_neighborhood",
            "Activism": "community_neighborhood",
            "Social": "community_neighborhood",
            
            # Parks & Outdoors
            "Parks": "parks_outdoors",
            "Recreation": "parks_outdoors",
            "Nature": "parks_outdoors",
            "Sustainability": "parks_outdoors",
            
            # Food & Drink
            "Food": "food_drink",
            "Culinary": "food_drink",
            
            # Learning & Workshops
            "Education": "learning_workshops",
            "Learning": "learning_workshops",
            "Professional": "learning_workshops",
            "Research": "learning_workshops",
            "Science": "learning_workshops",
            "Workshop": "learning_workshops",
            
            # Family & Youth
            "Youth": "family_youth",
            "Family": "family_youth",
            
            # Wellness & Fitness
            "Wellness": "wellness_fitness",
            "Fitness": "wellness_fitness",
            "Sports": "wellness_fitness",
            "Movement": "wellness_fitness",
            
            # Nightlife & Social
            "Nightlife": "nightlife_social",
            "Social": "nightlife_social",
            "Games": "nightlife_social"
        }
        
        # Build mappings for each community
        for community_id, community in self.communities.items():
            community_mappings = set()
            
            # Map community categories
            for category in community.get('category', []):
                if category in category_map:
                    community_mappings.add(category_map[category])
            
            # Map community tags
            for tag in community.get('tags', []):
                tag_upper = tag.title()
                if tag_upper in category_map:
                    community_mappings.add(category_map[tag_upper])
            
            # Map community type
            comm_type = community.get('type', '')
            if comm_type in category_map:
                community_mappings.add(category_map[comm_type])
            
            mappings[community_id] = list(community_mappings)
            
        return mappings
    
    def _get_community_categories(self, event: Dict) -> List[str]:
        """Get relevant categories based on community information"""
        community_id = event.get('communityId')
        if not community_id or community_id not in self.communities:
            return []
            
        # Get pre-mapped categories for this community
        base_categories = self.community_category_mappings.get(community_id, [])
        
        # Get community data
        community = self.communities[community_id]
        
        # Add categories based on community type
        if community.get('type') == 'Cultural Institution':
            base_categories.append('arts_culture')
        elif community.get('type') == 'Tech Community':
            base_categories.append('learning_workshops')
        
        return list(set(base_categories))  # Remove duplicates
    
    def _get_text_embedding(self, text: str) -> np.ndarray:
        """Get BERT embedding for a text string"""
        with torch.no_grad():
            inputs = self.tokenizer(
                text,
                return_tensors='pt',
                truncation=True,
                max_length=512,
                padding=True
            ).to(self.device)
            
            outputs = self.model(**inputs)
            # Use CLS token embedding as text representation
            embedding = outputs.last_hidden_state[0][0].cpu().numpy()
            
        return embedding
    
    def _cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        """Calculate cosine similarity between two vectors"""
        return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))
    
    def _get_community_boost(self, event: Dict, category: str, similarity: float) -> float:
        """Calculate confidence boost based on community data"""
        boost = 0.0
        
        # Get community data if available
        community_id = event.get('communityId')
        if community_id and community_id in self.communities:
            community = self.communities[community_id]
            
            # Boost if community type matches category
            if community['type'] in CATEGORIES[category].get('community_types', []):
                boost += 0.15
            
            # Boost based on community categories
            community_categories = [cat.lower() for cat in community.get('category', [])]
            category_keywords = [kw.lower() for kw in CATEGORIES[category]['keywords']]
            if any(cat in category_keywords for cat in community_categories):
                boost += 0.1
                
            # Boost based on community tags
            community_tags = [tag.lower() for tag in community.get('tags', [])]
            if any(tag in category_keywords for tag in community_tags):
                boost += 0.05
        
        return min(boost, 0.3)  # Cap the boost at 0.3
    
    def _get_location_boost(self, event: Dict, category: str, similarity: float) -> float:
        """Calculate confidence boost based on location data"""
        boost = 0.0
        
        # Get location data if available
        location_id = event.get('locationId')
        if location_id and location_id in self.locations:
            location = self.locations[location_id]
            
            # Boost if location type matches category
            if location['type'] in CATEGORIES[category].get('location_types', []):
                boost += 0.15
            
            # Boost based on location amenities
            amenities = [am.lower() for am in location.get('amenities', [])]
            category_keywords = [kw.lower() for kw in CATEGORIES[category]['keywords']]
            if any(am in category_keywords for am in amenities):
                boost += 0.1
        
        return min(boost, 0.3)  # Cap the boost at 0.3
    
    def categorize_event(self, event: Dict) -> List[Tuple[str, float]]:
        """Categorize an event using both community info and content analysis"""
        # Get community-based categories first
        community_categories = self._get_community_categories(event)
        
        # Combine relevant text fields with different weights
        event_text = (
            f"{event.get('name', '')} " 
            f"{' '.join(event.get('tags', []))} " 
            f"{event.get('type', '')} " * 2 +  # Weight event type
            f"{' '.join(str(cat) for cat in event.get('category', []))} " 
            f"{event.get('description', '')} "  # Base weight for description
        )
        
        # Get event embedding
        event_embedding = self._get_text_embedding(event_text)
        
        # Calculate similarity with each category
        similarities = []
        for category, embedding in self.category_embeddings.items():
            # Get base similarity
            similarity = self._cosine_similarity(event_embedding, embedding)
            
            # Boost score if category was suggested by community info
            if category in community_categories:
                similarity = min(similarity * 1.5, 1.0)  # 50% boost, capped at 1.0
            
            # Apply community-based boost
            community_boost = self._get_community_boost(event, category, similarity)
            
            # Apply location-based boost
            location_boost = self._get_location_boost(event, category, similarity)
            
            # Combine base similarity with boosts
            final_similarity = min(similarity + community_boost + location_boost, 1.0)
            
            similarities.append((category, final_similarity))
        
        # Sort by similarity score
        similarities.sort(key=lambda x: x[1], reverse=True)
        
        # Filter out low confidence matches
        return [(cat, conf) for cat, conf in similarities if conf > 0.6]  # Lowered threshold for better coverage

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

def main():
    # Initialize categorizer
    categorizer = EventCategorizer()
    
    # Get all JSON files from data directory
    data_dir = 'scrapers/data'
    json_files = [f for f in os.listdir(data_dir) if f.endswith('.json')]
    
    all_events = []
    category_stats = {}  # Track statistics for each category
    source_stats = {}    # Track statistics for each source file
    
    # Process each input file
    for json_file in json_files:
        file_path = os.path.join(data_dir, json_file)
        source_name = json_file.replace('.json', '')
        
        logging.info(f"\nProcessing {json_file}")
        events = load_events(file_path)
        source_stats[source_name] = {'total': len(events), 'categorized': 0, 'categories': {}}
        
        # Add events to all_events list
        all_events.extend(events)
    
    # Categorize events
    for event in tqdm(all_events, desc="Categorizing events"):
        # Get category predictions
        categories = categorizer.categorize_event(event)
        
        # Construct event text for subcategory matching
        event_text = (
            f"{event.get('name', '')} " +
            f"{event.get('description', '')} " +
            f"{' '.join(event.get('tags', []))} " +
            f"{event.get('type', '')} " +
            f"{' '.join(str(cat) for cat in event.get('category', []))}"
        ).lower()
        
        # Check for farmers market specifically
        if any(kw in event_text for kw in ["greenmarket", "farmstand", "farm stand", "farmers market"]):
            # Add farmers market as a high confidence category if found
            categories = [("farmers_market", 0.95)] + [c for c in categories if c[0] != "farmers_market"]
        
        # Add top categories to event
        event['categories'] = [
            {
                'name': CATEGORIES[cat]['name'],
                'id': cat,
                'confidence': float(conf),
                'subcategories': [
                    sub for sub in CATEGORIES[cat]['subcategories']
                    if any(kw in event_text for kw in [sub.replace('_', ' ')])
                ]
            }
            for cat, conf in categories[:3]  # Keep top 3 categories
            if conf > 0.6  # Lower threshold to 40% for better coverage
        ]
        
        # Track statistics
        if event['categories']:
            source_stats[source_name]['categorized'] += 1
            for cat in event['categories']:
                # Update source stats
                source_stats[source_name]['categories'][cat['id']] = \
                    source_stats[source_name]['categories'].get(cat['id'], 0) + 1
                
                # Update overall category stats
                if cat['id'] not in category_stats:
                    category_stats[cat['id']] = {
                        'name': cat['name'],
                        'total': 0,
                        'sources': {},
                        'avg_confidence': 0,
                        'subcategories': {}
                    }
                category_stats[cat['id']]['total'] += 1
                category_stats[cat['id']]['sources'][source_name] = \
                    category_stats[cat['id']]['sources'].get(source_name, 0) + 1
                category_stats[cat['id']]['avg_confidence'] += cat['confidence']
                
                # Track subcategories
                for sub in cat.get('subcategories', []):
                    category_stats[cat['id']]['subcategories'][sub] = \
                        category_stats[cat['id']]['subcategories'].get(sub, 0) + 1
        
        # Add source information
        event['source'] = source_name
    
    # Calculate averages and sort subcategories
    for cat_id in category_stats:
        if category_stats[cat_id]['total'] > 0:
            category_stats[cat_id]['avg_confidence'] /= category_stats[cat_id]['total']
            # Sort subcategories by frequency
            category_stats[cat_id]['subcategories'] = dict(
                sorted(
                    category_stats[cat_id]['subcategories'].items(),
                    key=lambda x: x[1],
                    reverse=True
                )
            )
    
    # Save categorized events
    output_path = 'data/categorized_events.json'
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    save_categorized_events(all_events, output_path)
    logging.info(f"Saved {len(all_events)} categorized events to {output_path}")
    
    # Save statistics
    stats_output = {
        'summary': {
            'total_events': len(all_events),
            'total_sources': len(json_files),
            'total_categories': len(category_stats)
        },
        'categories': category_stats,
        'sources': source_stats
    }
    
    stats_path = 'data/categorization_stats.json'
    with open(stats_path, 'w') as f:
        json.dump(stats_output, f, indent=2)
    
    # Log summary statistics
    logging.info("\n=== Categorization Summary ===")
    logging.info(f"Total Events Processed: {stats_output['summary']['total_events']}")
    logging.info(f"Total Sources: {stats_output['summary']['total_sources']}")
    logging.info(f"Total Categories Used: {stats_output['summary']['total_categories']}")
    
    logging.info("\n=== Top Categories ===")
    sorted_cats = sorted(
        category_stats.items(),
        key=lambda x: x[1]['total'],
        reverse=True
    )
    for cat_id, stats in sorted_cats:
        logging.info(f"\n{stats['name']} ({cat_id}):")
        logging.info(f"  Total Events: {stats['total']}")
        logging.info(f"  Average Confidence: {stats['avg_confidence']:.2f}")
        logging.info(f"  Top Sources: {dict(sorted(stats['sources'].items(), key=lambda x: x[1], reverse=True)[:3])}")
        if stats['subcategories']:
            logging.info("  Top Subcategories:")
            for sub, count in list(stats['subcategories'].items())[:5]:
                logging.info(f"    - {sub}: {count}")
    
    logging.info("\n=== Source Statistics ===")
    for source, stats in sorted(source_stats.items(), key=lambda x: x[1]['total'], reverse=True):
        logging.info(f"\n{source}:")
        logging.info(f"  Total Events: {stats['total']}")
        logging.info(f"  Categorized Events: {stats['categorized']} ({(stats['categorized']/stats['total']*100):.1f}%)")
        if stats['categories']:
            logging.info("  Top Categories:")
            sorted_cats = sorted(stats['categories'].items(), key=lambda x: x[1], reverse=True)[:3]
            for cat_id, count in sorted_cats:
                logging.info(f"    - {CATEGORIES[cat_id]['name']}: {count}")

if __name__ == '__main__':
    main() 