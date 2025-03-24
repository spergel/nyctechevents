import os
import json
from datetime import datetime, timedelta
import logging
import pyshorteners
from dateutil import parser
import webbrowser
import time
import glob

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def shorten_url(url):
    """Shorten URL using TinyURL"""
    try:
        s = pyshorteners.Shortener()
        return s.tinyurl.short(url)
    except Exception as e:
        logger.warning(f"Failed to shorten URL: {e}")
        return url

def format_event_tweet(event):
    """Format a single event for Twitter with a narrative style"""
    tweet = ""
    
    # Add event title
    tweet += f"{event['name']}.\n\n"
    
    # Add time details if available
    if event.get('startDate'):
        try:
            start_time = parser.parse(event['startDate'])
            tweet += f"Time: {start_time.strftime('%I:%M %p')}\n"
        except Exception:
            pass
    
    # Add location if available
    venue = event.get('metadata', {}).get('venue', {})
    if venue.get('address'):
        tweet += f"Location: {venue['address']}\n"
    elif venue.get('name'):
        tweet += f"Location: {venue['name']}\n"
    
    # Add description if available, truncated to fit
    if event.get('description'):
        desc = event['description'].replace('<br>', '\n').replace('<br/>', '\n')
        if len(desc) > 150:  # Truncate long descriptions
            desc = desc[:147] + "..."
        tweet += f"\n{desc}\n"
    
    # Add shortened URL if available
    if event.get('metadata', {}).get('source_url'):
        short_url = shorten_url(event['metadata']['source_url'])
        tweet += f"\nMore info: {short_url}"
    
    # Ensure tweet is within character limit
    if len(tweet) > 280:
        tweet = tweet[:277] + "..."
    
    return tweet

def get_upcoming_events(events_file, days_ahead=1):
    """Get events happening in the next few days"""
    try:
        with open(events_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            events = data.get('events', [])
        
        target_date = datetime.now().date() + timedelta(days=days_ahead)
        logger.info(f"Looking for events on {target_date}")
        
        upcoming = []
        for event in events:
            try:
                # Skip events without a start date
                if not event.get('startDate'):
                    continue
                    
                # Try to parse the date
                event_date = parser.parse(event['startDate']).date()
                if event_date == target_date:
                    upcoming.append(event)
            except Exception as e:
                logger.debug(f"Could not parse date for event {event.get('name')}: {e}")
                continue
        
        # Sort events by time if available
        def get_event_time(event):
            try:
                return parser.parse(event['startDate']).time()
            except:
                return datetime.max.time()
                
        upcoming.sort(key=get_event_time)
        
        logger.info(f"Found {len(upcoming)} events for {target_date}")
        return upcoming
    except Exception as e:
        logger.error(f"Error reading events file: {e}")
        return []

def cleanup_old_files():
    """Delete older tweet files to avoid clutter, keeping only the 5 most recent ones"""
    try:
        tweets_dir = os.path.join('tech', 'tweets')
        if not os.path.exists(tweets_dir):
            return
            
        # Get all HTML files
        html_files = glob.glob(os.path.join(tweets_dir, 'tweets_*.html'))
        
        # Sort by modification time (oldest first)
        html_files.sort(key=os.path.getmtime)
        
        # Delete all but the 5 most recent files
        if len(html_files) > 5:
            for file_to_delete in html_files[:-5]:
                try:
                    os.remove(file_to_delete)
                    logger.info(f"Deleted old tweet file: {file_to_delete}")
                except Exception as e:
                    logger.warning(f"Failed to delete {file_to_delete}: {e}")
    except Exception as e:
        logger.warning(f"Error in cleanup: {e}")

def generate_daily_tweets():
    """Generate tweets for upcoming events and save to a file for manual posting"""
    try:
        # Clean up old tweet files first
        cleanup_old_files()
        
        events_file = os.path.join('public', 'data', 'events.json')
        
        upcoming_events = get_upcoming_events(events_file)
        if not upcoming_events:
            logger.info("No upcoming events found for the target date")
            return
        
        target_date = (datetime.now() + timedelta(days=1))
        date_str = target_date.strftime('%A, %B %d')
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        # Create output directory if it doesn't exist
        output_dir = os.path.join('tech', 'tweets')
        os.makedirs(output_dir, exist_ok=True)
        
        # File to save tweets - only HTML now
        html_file = os.path.join(output_dir, f'tweets_{timestamp}.html')
        
        tweets = []
        
        # Intro tweet
        intro_tweet = f"Here are some things to do {date_str} in New York"
        tweets.append(intro_tweet)
        
        # Event tweets
        event_count = min(5, len(upcoming_events))
        for i, event in enumerate(upcoming_events[:event_count]):
            tweet_text = format_event_tweet(event)
            tweets.append(tweet_text)
        
        # Save tweets to HTML file for easier copying
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(f"""<!DOCTYPE html>
<html>
<head>
    <title>Tweets for {date_str}</title>
    <style>
        body {{ font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }}
        .tweet-container {{ margin-bottom: 30px; border: 1px solid #ccc; padding: 15px; border-radius: 10px; }}
        .tweet-header {{ font-weight: bold; margin-bottom: 10px; color: #1DA1F2; }}
        .tweet-content {{ white-space: pre-wrap; }}
        .tweet-content textarea {{ width: 100%; height: 120px; padding: 10px; margin-top: 10px; }}
        .copy-btn {{ background-color: #1DA1F2; color: white; border: none; padding: 8px 15px; 
                   border-radius: 5px; cursor: pointer; margin-top: 10px; }}
        .copy-btn:hover {{ background-color: #0c85d0; }}
        .btn-container {{ display: flex; justify-content: space-between; margin-top: 10px; }}
        .open-twitter {{ background-color: #657786; }}
        h1 {{ color: #1DA1F2; }}
    </style>
    <script>
        function copyToClipboard(id) {{
            var textarea = document.getElementById('textarea-' + id);
            textarea.select();
            document.execCommand('copy');
            
            var btn = document.getElementById('copy-btn-' + id);
            btn.textContent = 'Copied!';
            setTimeout(function() {{
                btn.textContent = 'Copy';
            }}, 2000);
        }}
        
        function openTwitter(id) {{
            window.open('https://twitter.com/intent/tweet', '_blank');
        }}
    </script>
</head>
<body>
    <h1>Tweets for {date_str}</h1>
    <p>Click "Copy" to copy a tweet to your clipboard, then click "Open Twitter" to post it.</p>
""")
            
            for i, tweet in enumerate(tweets):
                tweet_num = i + 1
                reply_info = f" (Reply to Tweet {i})" if i > 0 else " (Thread starter)"
                
                f.write(f"""
    <div class="tweet-container">
        <div class="tweet-header">Tweet {tweet_num}{reply_info}</div>
        <div class="tweet-content">
            <textarea id="textarea-{tweet_num}">{tweet}</textarea>
            <div class="btn-container">
                <button class="copy-btn" id="copy-btn-{tweet_num}" onclick="copyToClipboard('{tweet_num}')">Copy</button>
                <button class="copy-btn open-twitter" onclick="openTwitter('{tweet_num}')">Open Twitter</button>
            </div>
        </div>
    </div>
""")
            
            f.write("""
</body>
</html>
""")
        
        logger.info(f"Generated {len(tweets)} tweets for {date_str}")
        logger.info(f"HTML version saved to {html_file}")
        
        # Print path for easy access
        print(f"\nTweets saved to HTML file: {os.path.abspath(html_file)}")
        
        # Try to open the HTML file in a browser - only for local testing
        if not os.environ.get('VERCEL_ENV'):
            try:
                print("\nOpening HTML file in your browser...")
                webbrowser.open(f"file://{os.path.abspath(html_file)}")
            except Exception as e:
                print(f"Could not open browser automatically: {e}")
        
    except Exception as e:
        logger.error(f"Error generating tweets: {str(e)}")
        raise

if __name__ == "__main__":
    generate_daily_tweets() 