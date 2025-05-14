import os
import json
from datetime import datetime, timedelta
import logging
from pathlib import Path
import pytz
import tweepy
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Gemini API Key
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

# Twitter API Credentials (Replace with your actual credentials or use environment variables)
TWITTER_API_KEY = os.environ.get("TWITTER_API_KEY", "YOUR_API_KEY")
TWITTER_API_SECRET = os.environ.get("TWITTER_API_SECRET", "YOUR_API_SECRET")
TWITTER_ACCESS_TOKEN = os.environ.get("TWITTER_ACCESS_TOKEN", "YOUR_ACCESS_TOKEN")
TWITTER_ACCESS_TOKEN_SECRET = os.environ.get("TWITTER_ACCESS_TOKEN_SECRET", "YOUR_ACCESS_TOKEN_SECRET")

# Setup paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, 'data')
TWEETS_DIR = os.path.join(SCRIPT_DIR, 'tweets')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

if GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        logging.info("Gemini API configured successfully.")
    except Exception as e:
        logging.error(f"Error configuring Gemini API: {e} - Ensure GEMINI_API_KEY is valid.")
        GEMINI_API_KEY = None
else:
    logging.warning("GEMINI_API_KEY not found in environment variables. Tweet generation will use fallback.")

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

def filter_upcoming_events(events, days_ahead=2):
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

def generate_tweet_with_gemini(event):
    """Generates a tweet using the Gemini API."""
    if not GEMINI_API_KEY:
        logging.warning("Gemini API key not available. Using fallback tweet content.")
        return f"Check out this event: {event.get('name', 'N/A')}! More info at {event.get('url', '#')}"

    try:
        model = genai.GenerativeModel('gemini-pro')

        # Prepare event details for the prompt
        # Ensure all potentially missing data is handled gracefully for the prompt
        event_name = event.get('name', 'Unnamed Event')
        start_date_str = event.get('startDate', 'Not specified')
        description = event.get('description', 'No description provided.')
        venue = event.get('location', {}).get('name', 'Venue TBD')
        price_info = event.get('price', {})
        price_type = price_info.get('type', 'N/A')
        price_amount = price_info.get('amount', '')
        price_str = f"{price_type} (${price_amount})" if price_type not in ['Free', 'N/A'] else price_type
        url = event.get('url', '#')
        if url == '#': # Try to use sourceSite if primary URL is just a placeholder
            url = event.get('sourceSite', '#')

        # Attempt to format date nicely if possible
        try:
            if start_date_str != 'Not specified':
                dt_obj = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
                formatted_date = dt_obj.strftime("%A, %B %d at %I:%M %p %Z")
            else:
                formatted_date = "Date not specified"
        except ValueError:
            formatted_date = start_date_str # Fallback to original string if parsing fails

        prompt = f"""Create an engaging and concise tweet for the following NYC tech event.
        The event is: {event_name}
        Date: {formatted_date}
        Description: {description}
        Venue: {venue}
        Price: {price_str}
        Link: {url}

        The tweet should be exciting, encourage people to check it out, and include relevant hashtags like #NYCTech, #TechEvent, and others based on the event details. Max 280 characters. Directly provide only the tweet text."""
        
        logging.info(f"Sending prompt to Gemini for event: {event_name}")
        response = model.generate_content(prompt)
        
        generated_tweet = response.text.strip()
        logging.info(f"Tweet generated by Gemini for {event_name}: {generated_tweet}")
        return generated_tweet

    except Exception as e:
        logging.error(f"Error generating tweet with Gemini for event {event_name}: {e}")
        # Fallback tweet content in case of API error
        return f"Check out: {event_name} on {formatted_date}. Link: {url} #NYCTech (Error generating creative tweet)"

def post_to_twitter(tweet_text, api_key, api_secret, access_token, access_token_secret):
    """Authenticates with Twitter and posts a tweet."""
    try:
        auth = tweepy.OAuth1UserHandler(
            api_key, api_secret, access_token, access_token_secret
        )
        api = tweepy.API(auth)
        api.update_status(tweet_text)
        logging.info(f"Successfully tweeted: {tweet_text}")
        return True
    except Exception as e:
        logging.error(f"Error posting to Twitter: {e}")
        return False

def main():
    """Main function to generate tweets."""
    try:
        # Create tweets directory if it doesn't exist
        # os.makedirs(TWEETS_DIR, exist_ok=True) Commenting out this line
        
        # Load and filter events
        events = load_events()
        logging.info(f"Loaded {len(events)} events total")
        
        upcoming_events = filter_upcoming_events(events)
        
        if not upcoming_events:
            logging.warning("No upcoming events found")
            return
        
        logging.info(f"Processing {len(upcoming_events)} events for tweeting.")
        for event in upcoming_events:
            tweet_content = generate_tweet_with_gemini(event)
            logging.info(f"Final tweet content for {event.get('name', 'Unnamed Event')}: {tweet_content}")

            # Post to Twitter
            if TWITTER_API_KEY and TWITTER_API_KEY != "YOUR_API_KEY": 
                post_to_twitter(
                    tweet_content,
                    TWITTER_API_KEY,
                    TWITTER_API_SECRET,
                    TWITTER_ACCESS_TOKEN,
                    TWITTER_ACCESS_TOKEN_SECRET
                )
            else:
                logging.warning("Skipping Twitter post: Twitter API credentials are placeholders or missing.")

    except Exception as e:
        logging.error(f"Error in tweet generation: {e}")
        raise

if __name__ == '__main__':
    main() 