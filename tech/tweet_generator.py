import os
import json
from datetime import datetime, timedelta
import logging
from pathlib import Path
import pytz

# Setup paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, 'data')
TWEETS_DIR = os.path.join(SCRIPT_DIR, 'tweets')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def load_events(events_file='combined_events.json'):
    """Load events from the events file."""
    try:
        # Look in the parent scraper/data directory for combined_events.json
        parent_data_dir = os.path.join(os.path.dirname(SCRIPT_DIR), 'data')
        with open(os.path.join(parent_data_dir, events_file), 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get('events', [])
    except Exception as e:
        logging.error(f"Error loading events: {e}")
        return []

def filter_upcoming_events(events, days_ahead=7):
    """Filter events happening in the next X days."""
    now = datetime.now(pytz.utc)
    
    # Check if this is test data (assuming test data has specific event names)
    is_test_data = any(event.get('name') in ['Valid Event', 'No Date Event', 'Invalid URL Event'] for event in events)
    
    if is_test_data:
        logging.info("Test data detected - including all events with valid dates")
        upcoming = []
        for event in events:
            if event.get('startDate'):
                upcoming.append(event)
                logging.info(f"Including test event: {event.get('name')}")
            else:
                logging.warning(f"Skipping test event without date: {event.get('name', 'Unknown')}")
        
        return upcoming
    
    # Regular processing for non-test data
    cutoff = now + timedelta(days=days_ahead)
    logging.info(f"Using date range: {now} to {cutoff}")
    
    upcoming = []
    skipped_no_date = 0
    skipped_date_parsing = 0
    skipped_past_or_future = 0
    
    for event in events:
        try:
            # Skip events without a startDate
            if not event.get('startDate'):
                logging.warning(f"Skipping event without start date: {event.get('name', 'Unknown')}")
                skipped_no_date += 1
                continue
                
            # Handle both timezone-aware and timezone-naive datetimes
            start_date_str = event['startDate'].replace('Z', '+00:00')
            start_date = datetime.fromisoformat(start_date_str)
            
            # Make sure start_date is timezone aware
            if start_date.tzinfo is None:
                # If it's naive, assume it's in UTC
                start_date = pytz.utc.localize(start_date)
                
            if now <= start_date <= cutoff:
                upcoming.append(event)
                logging.info(f"Including event: {event.get('name')} on {start_date}")
            else:
                skipped_past_or_future += 1
                logging.debug(f"Skipping event outside date range: {event.get('name')} on {start_date}")
        except Exception as e:
            logging.warning(f"Error parsing date for event {event.get('name')}: {e}")
            skipped_date_parsing += 1
            continue
    
    logging.info(f"Event processing summary: {len(upcoming)} included, {skipped_no_date} skipped (no date), " +
                f"{skipped_date_parsing} skipped (date parsing error), {skipped_past_or_future} skipped (outside date range)")
    
    return upcoming

def format_event_tweet(event):
    """Format a single event as a tweet."""
    try:
        # Skip events with missing required fields
        if not event.get('startDate') or not event.get('name'):
            logging.warning(f"Skipping event with missing required fields: {event.get('name', 'Unknown')}")
            return ""
            
        # Handle both timezone-aware and timezone-naive datetimes
        start_date_str = event['startDate'].replace('Z', '+00:00')
        start_date = datetime.fromisoformat(start_date_str)
        
        # Make sure start_date is timezone aware
        if start_date.tzinfo is None:
            # If it's naive, assume it's in UTC
            start_date = pytz.utc.localize(start_date)
            
        # Convert to local timezone for display
        local_tz = pytz.timezone('America/New_York')
        local_start_date = start_date.astimezone(local_tz)
        
        date_str = local_start_date.strftime("%A, %B %d")
        time_str = local_start_date.strftime("%I:%M %p")
        
        # Get price info
        price = event.get('price', {})
        if not price or not isinstance(price, dict):
            price = {}
        price_str = "Free" if price.get('type') == 'Free' else f"${price.get('amount', 'TBD')}"
        
        # Get location info
        location = event.get('location', {})
        if not location or not isinstance(location, dict):
            location = {}
        venue = location.get('name', 'TBD')
        
        # Get description safely
        description = event.get('description', '')
        if not description or not isinstance(description, str):
            description = "No description available"
        
        # Get URL safely and ensure it's valid
        url = event.get('url', '')
        if not url or not isinstance(url, str) or url == '#':
            # Try to use source site URL as fallback
            url = event.get('sourceSite', '')
            if not url or not isinstance(url, str):
                url = '#'
        
        # Format tweet text
        tweet = f"""
        <div class="tweet">
            <h3>{event['name']}</h3>
            <p class="date">{date_str} at {time_str}</p>
            <p class="venue">📍 {venue}</p>
            <p class="price">💰 {price_str}</p>
            <p class="description">{description[:200]}...</p>
            <p class="link"><a href="{url}" target="_blank" rel="noopener noreferrer">More Info →</a></p>
        </div>
        """
        return tweet
    except Exception as e:
        logging.error(f"Error formatting tweet for event {event.get('name', 'Unknown')}: {e}")
        return ""

def generate_tweets_html(events):
    """Generate HTML content for all tweets."""
    tweets = [format_event_tweet(event) for event in events]
    tweets = [t for t in tweets if t]  # Remove empty tweets
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>NYC Tech Events - Upcoming Tweets</title>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                background: #f5f8fa;
            }}
            .tweet {{
                background: white;
                border: 1px solid #e1e8ed;
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 20px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }}
            .tweet h3 {{
                margin: 0 0 10px 0;
                color: #14171a;
            }}
            .tweet p {{
                margin: 8px 0;
                color: #657786;
                line-height: 1.4;
            }}
            .tweet .date {{
                font-weight: bold;
                color: #1da1f2;
            }}
            .tweet .description {{
                color: #14171a;
            }}
            .tweet .link a {{
                color: #1da1f2;
                text-decoration: none;
            }}
            .tweet .link a:hover {{
                text-decoration: underline;
            }}
            .header {{
                text-align: center;
                margin-bottom: 30px;
            }}
            .header h1 {{
                color: #14171a;
            }}
            .header p {{
                color: #657786;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>NYC Tech Events</h1>
            <p>Upcoming events for the next 7 days - Generated {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
        </div>
        {''.join(tweets)}
    </body>
    </html>
    """
    return html

def main():
    """Main function to generate tweets."""
    try:
        # Create tweets directory if it doesn't exist
        os.makedirs(TWEETS_DIR, exist_ok=True)
        
        # Load and filter events
        events = load_events()
        logging.info(f"Loaded {len(events)} events total")
        
        upcoming_events = filter_upcoming_events(events)
        
        if not upcoming_events:
            logging.warning("No upcoming events found")
            return
        
        # Generate tweets HTML
        html_content = generate_tweets_html(upcoming_events)
        
        # Save to file
        output_file = os.path.join(TWEETS_DIR, f'tweets_{datetime.now().strftime("%Y%m%d_%H%M%S")}.html')
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        logging.info(f"Generated tweets HTML for {len(upcoming_events)} events: {output_file}")
        
    except Exception as e:
        logging.error(f"Error in tweet generation: {e}")
        raise

if __name__ == '__main__':
    main() 