import json
import os
import torch
from transformers import BertTokenizer, BertModel
import numpy as np
from typing import Dict, List, Tuple
import logging
from tqdm import tqdm
import requests  # Import the requests library
from datetime import datetime, timedelta

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
        with open('../public/data/communities.json', 'r', encoding='utf-8') as f:
            communities_data = json.load(f)
            communities = {com['id']: com for com in communities_data.get('communities', [])}
            
        with open('../public/data/locations.json', 'r', encoding='utf-8') as f:
            locations_data = json.load(f)
            locations = {loc['id']: loc for loc in locations_data.get('locations', [])}
    except Exception as e:
        logging.warning(f"Could not load auxiliary data: {str(e)}")
    
    return communities, locations

# Define categories
CATEGORIES = {
    "tech_talks": {
        "name": "Tech Talks & Conferences",
        "subcategories": [
            "conferences",      # tech conferences
            "meetups",         # tech meetups
            "workshops",       # technical workshops
            "panels",         # expert panels
            "keynotes",       # keynote presentations
            "lightning_talks"  # lightning talks
        ],
        "keywords": [
            "tech talk", "conference", "meetup", "workshop", "panel", "keynote",
            "presentation", "speaker", "lightning talk", "tech event", "summit",
            "symposium", "tech conference", "developer conference", "tech summit"
        ],
        "community_types": ["Tech Community", "Conference Organizer"],
        "location_types": ["Conference Center", "Auditorium", "Meeting Space"]
    },
    "hackathons_competitions": {
        "name": "Hackathons & Competitions",
        "subcategories": [
            "hackathons",       # coding competitions
            "code_challenges",  # programming challenges
            "game_jams",       # game development events
            "datathons",       # data science competitions
            "pitch_contests",   # startup pitch competitions
            "tech_olympics"     # technology competitions
        ],
        "keywords": [
            "hackathon", "competition", "challenge", "code challenge", "game jam",
            "datathon", "pitch", "contest", "coding competition", "tech competition",
            "programming contest", "coding challenge", "competitive programming"
        ],
        "community_types": ["Tech Community", "Developer Group", "Startup Community"],
        "location_types": ["Coworking Space", "Tech Hub", "Innovation Center"]
    },
    "networking_social": {
        "name": "Networking & Social",
        "subcategories": [
            "tech_mixers",      # tech networking events
            "startup_socials",  # startup community events
            "founder_meetups",  # founder networking
            "industry_nights",  # industry networking
            "career_fairs",     # tech job fairs
            "community_events"  # tech community gatherings
        ],
        "keywords": [
            "networking", "mixer", "social", "meetup", "community", "startup",
            "founder", "entrepreneur", "career fair", "job fair", "industry night",
            "tech social", "tech mixer", "startup social", "tech community"
        ],
        "community_types": ["Tech Community", "Startup Community", "Professional Network"],
        "location_types": ["Coworking Space", "Tech Hub", "Event Space"]
    },
    "workshops_training": {
        "name": "Workshops & Training",
        "subcategories": [
            "coding_workshops",    # programming workshops
            "dev_training",       # developer training
            "tech_bootcamps",     # technology bootcamps
            "skill_development",  # technical skill development
            "certification_prep", # certification preparation
            "hands_on_labs"       # practical labs
        ],
        "keywords": [
            "workshop", "training", "bootcamp", "course", "class", "certification",
            "learning", "education", "skill development", "hands-on", "practical",
            "tutorial", "lab", "technical training", "coding workshop"
        ],
        "community_types": ["Education Provider", "Training Center", "Tech School"],
        "location_types": ["Training Center", "Classroom", "Lab Space"]
    },
    "startup_entrepreneurship": {
        "name": "Startup & Entrepreneurship",
        "subcategories": [
            "founder_talks",     # founder presentations
            "startup_pitch",     # pitch events
            "funding_events",    # investment/funding events
            "accelerator_demo",  # accelerator demo days
            "mentor_sessions",   # mentorship sessions
            "startup_workshop"   # startup workshops
        ],
        "keywords": [
            "startup", "entrepreneur", "founder", "pitch", "investor", "venture",
            "funding", "accelerator", "incubator", "mentor", "seed", "angel",
            "demo day", "pitch deck", "startup pitch", "venture capital"
        ],
        "community_types": ["Startup Community", "Investor Network", "Accelerator"],
        "location_types": ["Startup Hub", "Incubator", "Innovation Center"]
    },
    "tech_innovation": {
        "name": "Tech Innovation & Research",
        "subcategories": [
            "tech_demos",        # technology demonstrations
            "product_launches",  # new product launches
            "research_talks",    # research presentations
            "innovation_labs",   # innovation lab events
            "future_tech",       # emerging technology
            "research_showcase"  # research exhibitions
        ],
        "keywords": [
            "innovation", "research", "demo", "launch", "prototype", "emerging tech",
            "future tech", "breakthrough", "invention", "discovery", "showcase",
            "demonstration", "product launch", "technology demo", "innovation lab"
        ],
        "community_types": ["Research Institution", "Innovation Lab", "Tech Company"],
        "location_types": ["Research Lab", "Innovation Center", "Tech Campus"]
    },
    "coworking_workspace": {
        "name": "Coworking & Workspace",
        "subcategories": [
            "space_tours",       # workspace tours
            "member_events",     # member-only events
            "workspace_launch",  # new space openings
            "amenity_showcase",  # facility showcases
            "community_events",  # community gatherings
            "workspace_social"   # social events
        ],
        "keywords": [
            "coworking", "workspace", "office space", "hot desk", "dedicated desk",
            "private office", "meeting room", "conference room", "amenities", "tour",
            "member event", "facility", "space", "work environment", "flexible workspace"
        ],
        "community_types": ["Coworking Space", "Workspace Provider", "Office Community"],
        "location_types": ["Coworking Space", "Shared Office", "Business Center"]
    },
    "special_interest": {
        "name": "Special Interest Tech",
        "subcategories": [
            "ai_ml",            # AI/ML events
            "blockchain",       # blockchain/crypto
            "cybersecurity",    # security events
            "devops",          # DevOps events
            "mobile_dev",       # mobile development
            "cloud_computing"   # cloud technology
        ],
        "keywords": [
            "artificial intelligence", "machine learning", "blockchain", "crypto",
            "cybersecurity", "security", "devops", "mobile", "cloud", "web3",
            "data science", "big data", "IoT", "AR/VR", "quantum computing"
        ],
        "community_types": ["Tech Community", "Special Interest Group", "Professional Association"],
        "location_types": ["Tech Hub", "Innovation Center", "Research Lab"]
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
            # Tech Talks & Conferences
            "Tech Talks": "tech_talks",
            "Tech Conferences": "tech_talks",
            "Meetups": "tech_talks",
            "Workshops": "tech_talks",
            "Panels": "tech_talks",
            "Keynotes": "tech_talks",
            "Lightning Talks": "tech_talks",
            
            # Hackathons & Competitions
            "Hackathons": "hackathons_competitions",
            "Competitions": "hackathons_competitions",
            "Code Challenges": "hackathons_competitions",
            "Game Jams": "hackathons_competitions",
            "Datathons": "hackathons_competitions",
            "Pitch Contests": "hackathons_competitions",
            "Tech Olympics": "hackathons_competitions",
            
            # Networking & Social
            "Tech Mixers": "networking_social",
            "Startup Socials": "networking_social",
            "Founder Meetups": "networking_social",
            "Industry Nights": "networking_social",
            "Career Fairs": "networking_social",
            "Community Events": "networking_social",
            
            # Workshops & Training
            "Coding Workshops": "workshops_training",
            "Dev Training": "workshops_training",
            "Tech Bootcamps": "workshops_training",
            "Skill Development": "workshops_training",
            "Certification Prep": "workshops_training",
            "Hands-on Labs": "workshops_training",
            
            # Startup & Entrepreneurship
            "Founder Talks": "startup_entrepreneurship",
            "Startup Pitch": "startup_entrepreneurship",
            "Funding Events": "startup_entrepreneurship",
            "Accelerator Demo": "startup_entrepreneurship",
            "Mentor Sessions": "startup_entrepreneurship",
            "Startup Workshop": "startup_entrepreneurship",
            
            # Tech Innovation & Research
            "Tech Demos": "tech_innovation",
            "Product Launches": "tech_innovation",
            "Research Talks": "tech_innovation",
            "Innovation Labs": "tech_innovation",
            "Future Tech": "tech_innovation",
            "Research Showcase": "tech_innovation",
            
            # Coworking & Workspace
            "Space Tours": "coworking_workspace",
            "Member Events": "coworking_workspace",
            "Workspace Launch": "coworking_workspace",
            "Amenity Showcase": "coworking_workspace",
            "Community Events": "coworking_workspace",
            "Workspace Social": "coworking_workspace",
            
            # Special Interest Tech
            "AI/ML Events": "special_interest",
            "Blockchain Events": "special_interest",
            "Cybersecurity Events": "special_interest",
            "DevOps Events": "special_interest",
            "Mobile Development": "special_interest",
            "Cloud Technology": "special_interest"
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
            base_categories.append('tech_talks')
        elif community.get('type') == 'Tech Community':
            base_categories.append('workshops_training')
        
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

def deduplicate_events(events: List[Dict]) -> List[Dict]:
    """
    Deduplicate events based on Luma URLs or identical event details.
    For duplicate events, preserve both location and community information.
    """
    logging.info("\n=== Starting Event Deduplication ===")
    
    # Filter out events without a name or with a blank name
    original_count = len(events)
    events = [event for event in events if event.get('name') and event.get('name').strip()]
    if original_count > len(events):
        logging.info(f"Filtered out {original_count - len(events)} events without a name or with a blank name")
    
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
                logging.info(f"  Title: {event.get('name', 'N/A')}")
                logging.info(f"  Community ID: {event.get('communityId', 'N/A')}")
                logging.info(f"  Location: {event.get('locationId', 'N/A')}")
                logging.info(f"  Source: {event.get('source', 'N/A')}")
                if event.get('metadata'):
                    logging.info(f"  Organizer: {event['metadata'].get('organizer', 'N/A')}")
                    if 'speakers' in event['metadata']:
                        speakers = [s.get('name', 'N/A') for s in event['metadata']['speakers']]
                        logging.info(f"  Speakers: {', '.join(speakers)}")
            
            # Merge duplicate events
            merged_event = merge_duplicate_events(event_group)
            deduplicated_events.append(merged_event)
    
    # Add events without Luma URLs
    deduplicated_events.extend(events_without_luma)
    
    logging.info(f"\n=== Deduplication Summary ===")
    logging.info(f"Total events before deduplication: {len(events)}")
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
    
    logging.info(f"  Primary Community: {primary_community_id}")
    logging.info(f"  Associated Communities: {', '.join(associated_communities) if associated_communities else 'None'}")
    
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
        organizer_names = [org.get('name', 'Unknown') for org in organizers]
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
            logging.info(f"  Final speakers: {', '.join(s.get('name', 'N/A') for s in unique_speakers)}")
                
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
            "category": ["Tech"],
            "price": {
                "amount": price,
                "type": price_type,
                "currency": "USD",
                "details": ""
            },
            "capacity": 100,
            "registrationRequired": True,
            "tags": tags,
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
        } for i, (name, description, price, price_type, tags) in enumerate([
            (
                "Introduction to AI Workshop",
                "Learn the basics of artificial intelligence and machine learning in this hands-on workshop.",
                0, "Free", ["AI", "Workshop", "Tech"]
            ),
            (
                "NYC Tech Networking Mixer",
                "Connect with fellow tech professionals in a casual networking environment.",
                10, "Paid", ["Networking", "Social", "Tech"]
            ),
            (
                "Startup Pitch Night",
                "Watch innovative startups pitch their ideas to potential investors.",
                15, "Paid", ["Startup", "Pitch", "Innovation"]
            ),
            (
                "Web3 Developer Conference",
                "A full-day conference exploring the latest in blockchain and web3 development.",
                50, "Paid", ["Blockchain", "Conference", "Development"]
            ),
            (
                "Data Science Hackathon",
                "48-hour hackathon focused on solving real-world problems with data science.",
                0, "Free", ["Hackathon", "Data Science", "Competition"]
            )
        ])
    ]
    
    return default_events

def main():
    # Create necessary directories
    os.makedirs('scrapers/data', exist_ok=True)
    os.makedirs('stats', exist_ok=True)
    os.makedirs('../public/data', exist_ok=True)
    
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
        
        # Filter out events without a name or with a blank name
        original_count = len(events)
        events = [event for event in events if event.get('name') and event.get('name').strip()]
        if original_count > len(events):
            logging.info(f"Filtered out {original_count - len(events)} events without a name or with a blank name")
        
        source_stats[source_name] = {'total': len(events), 'categorized': 0, 'categories': {}}
        
        # Add events to all_events list
        all_events.extend(events)
    
    # If no events found, create default events
    if not all_events:
        all_events = create_default_events()
        source_stats['default'] = {'total': len(all_events), 'categorized': 0, 'categories': {}}
        
        # Save default events to data directory
        with open(os.path.join(data_dir, 'default_events.json'), 'w', encoding='utf-8') as f:
            json.dump({'events': all_events}, f, indent=2, ensure_ascii=False)
        
        logging.info(f"Created {len(all_events)} default events")
    
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
    
    # Deduplicate events before saving
    all_events = deduplicate_events(all_events)
    
    # Load existing locations
    existing_locations = {}
    try:
        with open('../public/data/locations.json', 'r', encoding='utf-8') as f:
            existing_locations = {loc['id']: loc for loc in json.load(f).get('locations', [])}
    except Exception as e:
        logging.warning(f"Could not load existing locations: {e}")
    
    # Generate new locations from events
    new_locations, venue_to_location = generate_locations_from_events(all_events, existing_locations)
    
    # Combine existing and new locations
    all_locations = {**existing_locations, **new_locations}
    
    # Calculate category averages
    for cat_id, stats in category_stats.items():
        if stats['total'] > 0:
            stats['avg_confidence'] = round(stats['avg_confidence'] / stats['total'], 2)
    
    # Save categorized events
    save_categorized_events(all_events, '../public/data/events.json')
    
   
    # Save category statistics
    with open('stats/category_stats.json', 'w', encoding='utf-8') as f:
        json.dump(category_stats, f, indent=2, ensure_ascii=False)
    
    # Save source statistics
    with open('stats/source_stats.json', 'w', encoding='utf-8') as f:
        json.dump(source_stats, f, indent=2, ensure_ascii=False)
    
    # Print summary
    logging.info("\nSummary:")
    logging.info(f"Total events: {len(all_events)}")
    logging.info(f"Total locations: {len(all_locations)}")
    logging.info("Top categories:")
    for cat_id, stats in sorted(category_stats.items(), key=lambda x: x[1]['total'], reverse=True)[:10]:
        logging.info(f"  {stats['name']}: {stats['total']} events ({stats['avg_confidence']} avg confidence)")

if __name__ == "__main__":
    main() 