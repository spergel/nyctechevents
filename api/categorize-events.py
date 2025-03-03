from http.server import BaseHTTPRequestHandler
import sys
import os
import json
from datetime import datetime
import logging

# Add the scripts directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '../scripts'))

from categorize_events import EventCategorizer, CATEGORIES
from run_all_scrapers import run_scraper, save_events_to_file, clean_event_fields
from scrapers.calendar_configs import SCRAPERS

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            # Initialize categorizer
            categorizer = EventCategorizer()
            all_events = []
            
            # Run each scraper
            for scraper in SCRAPERS:
                events = run_scraper(scraper)
                all_events.extend(events)
                logging.info(f"Collected {len(events)} events from {scraper}")
            
            # Process each event
            processed_events = []
            for event in all_events:
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
            
            # Save all processed events
            output_file = 'data/all_events.json'
            save_events_to_file(processed_events, output_file)
            
            # Generate statistics
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
                    category_stats[cat['id']]['avg_confidence'] /= category_stats[cat['id']]['count']
            
            # Save statistics
            stats = {
                'total_events': len(processed_events),
                'categories': category_stats,
                'timestamp': datetime.now().isoformat(),
                'status': 'success'
            }
            
            # Return success response
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(stats).encode())
            
        except Exception as e:
            # Log the error
            logging.error(f"Error in categorization: {str(e)}")
            
            # Return error response
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                'status': 'error',
                'message': str(e),
                'timestamp': datetime.now().isoformat()
            }).encode()) 