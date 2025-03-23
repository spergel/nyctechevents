import os
import sys
import json
import logging
from typing import List, Dict
from datetime import datetime

# Add the scrapers directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from substack_scraper import main as run_substack_scraper
from categorize_events import EventCategorizer, CATEGORIES

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.FileHandler('substack_scraper.log'), logging.StreamHandler()]
)

def load_events_from_file(file_path: str) -> List[Dict]:
    """Load events from a JSON file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get('events', []) if isinstance(data, dict) else data
    except Exception as e:
        logging.error(f"Error loading {file_path}: {e}")
        return []

def save_events_to_file(events: List[Dict], file_path: str):
    """Save events to a JSON file"""
    try:
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump({'events': events}, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logging.error(f"Error saving to {file_path}: {e}")

def clean_event_fields(event: Dict) -> Dict:
    """Remove deprecated fields and ensure consistent structure"""
    # Fields to remove
    fields_to_remove = ['type', 'category', 'tags']
    
    # Create a new event dict without deprecated fields
    cleaned_event = {k: v for k, v in event.items() if k not in fields_to_remove}
    
    # Ensure metadata exists
    if 'metadata' not in cleaned_event:
        cleaned_event['metadata'] = {}
    
    return cleaned_event

def main():
    # Run Substack scraper
    logging.info("Running Substack scraper...")
    run_substack_scraper()
    
    # Load Substack events
    substack_events = load_events_from_file('data/substack_events.json')
    logging.info(f"Loaded {len(substack_events)} Substack events")
    
    # Initialize categorizer
    categorizer = EventCategorizer()
    
    # Process each event
    processed_events = []
    for event in substack_events:
        # Clean deprecated fields
        cleaned_event = clean_event_fields(event)
        
        # Get category predictions
        categories = categorizer.categorize_event(cleaned_event)
        
        # Add categories to event metadata
        event_categories = [
            {
                'name': CATEGORIES[cat]['name'],
                'id': cat,
                'confidence': float(conf)
            }
            for cat, conf in categories
            if conf > 0.4  # Include categories with >40% confidence
        ]
        
        cleaned_event['metadata']['categories'] = event_categories
        processed_events.append(cleaned_event)
    
    # Save processed events
    output_file = 'data/substack_events_processed.json'
    save_events_to_file(processed_events, output_file)
    logging.info(f"\nProcessed {len(processed_events)} Substack events")
    logging.info(f"Saved to {output_file}")
    
    # Generate and save statistics
    category_stats = {}
    for event in processed_events:
        for cat in event['metadata'].get('categories', []):
            if cat['id'] not in category_stats:
                category_stats[cat['id']] = {
                    'name': cat['name'],
                    'count': 0,
                    'avg_confidence': 0.0
                }
            category_stats[cat['id']]['count'] += 1
            category_stats[cat['id']]['avg_confidence'] += cat['confidence']
    
    # Calculate averages
    for cat_id in category_stats:
        if category_stats[cat_id]['count'] > 0:
            category_stats[cat_id]['avg_confidence'] /= category_stats[cat_id]['count']
    
    # Save statistics
    stats_file = 'data/substack_stats.json'
    with open(stats_file, 'w', encoding='utf-8') as f:
        json.dump({
            'total_events': len(processed_events),
            'categories': category_stats,
            'timestamp': datetime.now().isoformat()
        }, f, indent=2)
    
    logging.info(f"\nSubstack Category Statistics:")
    for cat_id, stats in sorted(category_stats.items(), key=lambda x: x[1]['count'], reverse=True):
        logging.info(f"{stats['name']}: {stats['count']} events (avg conf: {stats['avg_confidence']:.2f})")

if __name__ == '__main__':
    main() 