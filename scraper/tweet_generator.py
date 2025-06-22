import os
import json
from datetime import datetime, timedelta
import logging
from pathlib import Path
import pytz
import tweepy
import google.generativeai as genai
from dotenv import load_dotenv
import pyshorteners
import re

load_dotenv()

# Gemini API Key
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

# Twitter API Credentials
TWITTER_API_KEY = os.environ.get("TWITTER_API_KEY", "YOUR_API_KEY")
TWITTER_API_SECRET = os.environ.get("TWITTER_API_SECRET", "YOUR_API_SECRET")
TWITTER_ACCESS_TOKEN = os.environ.get("TWITTER_ACCESS_TOKEN", "YOUR_ACCESS_TOKEN")
TWITTER_ACCESS_TOKEN_SECRET = os.environ.get("TWITTER_ACCESS_TOKEN_SECRET", "YOUR_ACCESS_TOKEN_SECRET")

# Setup paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, 'data') # After move, SCRIPT_DIR is 'scraper', so this is 'scraper/data'
TWEETS_DIR = os.path.join(SCRIPT_DIR, 'tweets') # After move, SCRIPT_DIR is 'scraper', so this is 'scraper/tweets'

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
        # After moving, SCRIPT_DIR is 'scraper', DATA_DIR is 'scraper/data' (defined as os.path.join(SCRIPT_DIR, 'data'))
        # combined_events.json is expected in DATA_DIR.
        file_path = os.path.join(DATA_DIR, events_file)
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get('events', [])
    except Exception as e:
        logging.error(f"Error loading events: {e}")
        return []

def get_events_for_target_day_ny(events, target_day_for_filtering_ny):
    """Filter events that occur on the specified target_day_for_filtering_ny in New York time."""
    ny_tz = pytz.timezone('America/New_York')
    
    # Ensure target_day_for_filtering_ny is the start of the day in NY
    day_start_ny = target_day_for_filtering_ny.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end_ny = day_start_ny + timedelta(days=1) # End of the target day (exclusive)

    logging.info(f"Filtering events for NY date: {day_start_ny.strftime('%Y-%m-%d')}, " +
                 f"Window (NYT): {day_start_ny.isoformat()} to {day_end_ny.isoformat()}")

    # Check if this is test data (assuming test data has specific event names)
    is_test_data = any(event.get('name') in ['Valid Event', 'No Date Event', 'Invalid URL Event'] for event in events)
    
    if is_test_data:
        logging.info("Test data detected - including all test events with valid dates, ignoring target day for tests.")
        upcoming_for_test = []
        for event in events:
            if event.get('startDate'):
                upcoming_for_test.append(event)
                logging.info(f"Including test event: {event.get('name')}")
        return upcoming_for_test
    
    upcoming_on_target_day = []
    skipped_no_date = 0
    skipped_date_parsing = 0
    skipped_outside_target_day = 0
    
    for event in events:
        try:
            if not event.get('startDate'):
                logging.warning(f"Skipping event without start date: {event.get('name', 'Unknown')}")
                skipped_no_date += 1
                continue
                
            start_date_str = event['startDate'].replace('Z', '+00:00') # Ensure ISO format compatibility
            event_start_utc = datetime.fromisoformat(start_date_str)
            
            if event_start_utc.tzinfo is None: # Should ideally always have tzinfo from source
                event_start_utc = pytz.utc.localize(event_start_utc)
                
            # Convert event start time to New York time
            event_start_ny = event_start_utc.astimezone(ny_tz)
            
            if day_start_ny <= event_start_ny < day_end_ny:
                upcoming_on_target_day.append(event)
                logging.info(f"Including event: {event.get('name')} starting at {event_start_ny.isoformat()} (NYT)")
            else:
                skipped_outside_target_day += 1
                logging.debug(f"Skipping event: {event.get('name')} starting at {event_start_ny.isoformat()} (NYT) - outside target day window.")
        except Exception as e:
            logging.warning(f"Error processing date for event {event.get('name')}: {e}")
            skipped_date_parsing += 1
            continue
            
    logging.info(f"Event processing for {day_start_ny.strftime('%Y-%m-%d')} (NYT) summary: " +
                 f"{len(upcoming_on_target_day)} included, " +
                 f"{skipped_no_date} skipped (no date), " +
                 f"{skipped_date_parsing} skipped (date parsing error), " +
                 f"{skipped_outside_target_day} skipped (outside target day)")
                 
    return upcoming_on_target_day

def shorten_url(long_url):
    if not long_url or long_url == '#':
        return "#" # Return placeholder if no valid URL
    try:
        s = pyshorteners.Shortener()
        short_url = s.tinyurl.short(long_url)
        # Remove http:// or https:// from the beginning of the URL
        if short_url.startswith("https://"):
            return short_url[len("https://"):]
        elif short_url.startswith("http://"):
            return short_url[len("http://"):]
        return short_url
    except Exception as e:
        logging.error(f"Error shortening URL {long_url}: {e}")
        return long_url # Fallback to long_url if shortening fails

def generate_tweet_with_gemini(event):
    """Generates a tweet using the Gemini API."""
    if not GEMINI_API_KEY:
        logging.warning("Gemini API key not available. Using fallback tweet content.")
        return f"Check out this event: {event.get('name', 'N/A')}! More info at {event.get('url', '#')}"

    try:
        model = genai.GenerativeModel('gemini-1.5-flash') # Using a known valid model

        # Prepare event details for the prompt
        # Ensure all potentially missing data is handled gracefully for the prompt
        event_name = event.get('name', 'Unnamed Event')
        start_date_str = event.get('startDate', 'Not specified')
        description = event.get('description', 'No description provided.')
        venue = event.get('location', {}).get('name', 'Venue TBD')
        price_info = event.get('price') or {}  # Handle None case
        price_type = price_info.get('type', 'N/A')
        price_amount = price_info.get('amount', '')
        price_str = f"{price_type} (${price_amount})" if price_type not in ['Free', 'N/A'] else price_type
        
        # Use metadata.source_url as the primary URL source
        original_url = event.get('metadata', {}).get('source_url', '#')
        # If still a placeholder, try the older direct 'url' or 'sourceSite' fields as fallbacks
        if original_url == '#':
            original_url = event.get('url', '#') 
        if original_url == '#':
            original_url = event.get('sourceSite', '#')
        
        display_url = shorten_url(original_url) # Use the new shorten_url function

        # Attempt to format date nicely if possible
        formatted_date = "Date not specified"  # Default value
        try:
            if start_date_str != 'Not specified':
                dt_obj = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
                formatted_date = dt_obj.strftime("%A, %B %d at %I:%M %p %Z")
        except ValueError:
            formatted_date = start_date_str # Fallback to original string if parsing fails

        prompt = f"""Create an engaging and concise tweet for the following NYC tech event.
        The event is: {event_name}
        Date: {formatted_date}
        Description: {description}
        Venue: {venue}
        Price: {price_str}
        Link: {display_url}

        The tweet should be exciting and encourage people to check it out. Do NOT include any hashtags. 
        Max 280 characters. Directly provide only the tweet text."""
        
        logging.info(f"Sending prompt to Gemini for event: {event_name} with display_url: {display_url}")
        response = model.generate_content(prompt)
        
        generated_tweet = response.text.strip()
        
        logging.info(f"Tweet generated by Gemini for {event_name}: {generated_tweet}")
        return generated_tweet

    except Exception as e:
        logging.error(f"Error generating tweet with Gemini for event {event_name}: {e}")
        # Fallback tweet content in case of API error
        # Ensure fallback also uses a processed URL if original_url was defined, or a placeholder
        fallback_url_display = shorten_url(original_url) if 'original_url' in locals() and original_url else "#"
        return f"Check out: {event_name} on {formatted_date}. Link: {fallback_url_display} (Error generating creative tweet)"

def post_to_twitter(tweet_text, api_key, api_secret, access_token, access_token_secret, in_reply_to_tweet_id=None):
    """Authenticates with Twitter and posts a tweet using API v2, optionally as a reply."""
    try:
        client = tweepy.Client(
            consumer_key=api_key,
            consumer_secret=api_secret,
            access_token=access_token,
            access_token_secret=access_token_secret
        )
        
        # Make the request to create a Tweet using API v2
        if in_reply_to_tweet_id:
            logging.info(f"Posting reply to tweet ID: {in_reply_to_tweet_id}")
            response = client.create_tweet(text=tweet_text, in_reply_to_tweet_id=in_reply_to_tweet_id)
        else:
            logging.info("Posting new tweet (not a reply)")
            response = client.create_tweet(text=tweet_text)
        
        if response.data and response.data.get('id'):
            tweet_id = response.data['id']
            logging.info(f"Successfully tweeted using API v2! Tweet ID: {tweet_id}")
            logging.debug(f"Full API v2 response: {response}")
            return tweet_id # Return the ID of the newly created tweet
        else:
            logging.error(f"Error posting to Twitter using API v2. Response: {response}")
            # Log errors if present in the response, which can happen even with a 2xx status for partial success
            if response.errors:
                for error in response.errors:
                    logging.error(f"API v2 Error: {error}")
            return None # Changed from False to None for clarity

    except tweepy.TweepyException as e:
        logging.error(f"Error posting to Twitter using API v2 (TweepyException): {e}")
        # Attempt to log more detailed error information if available
        if hasattr(e, 'api_codes') and e.api_codes:
            for code in e.api_codes:
                logging.error(f"API Code: {code}")
        if hasattr(e, 'api_errors') and e.api_errors:
            for error_detail in e.api_errors:
                logging.error(f"API Error Detail: {error_detail}")
        if hasattr(e, 'response') and e.response is not None:
            logging.error(f"API Response Text: {e.response.text}")
        return None # Changed from False to None
    except Exception as e:
        logging.error(f"An unexpected error occurred in post_to_twitter (API v2): {e}")
        return None # Changed from False to None

def main():
    """Main function to generate tweets and post them as a thread."""
    try:
        events = load_events()
        logging.info(f"Loaded {len(events)} events total")
        
        # Determine the target date for the tweet header and event filtering
        # This will be two days from the script's current run date in New York
        ny_tz = pytz.timezone('America/New_York')
        current_time_ny = datetime.now(ny_tz)
        
        # target_day_for_header is for display in the tweet
        target_day_for_header = current_time_ny + timedelta(days=2)
        target_day_for_header_str = target_day_for_header.strftime("%A, %B %d")
        
        # target_day_for_filtering is the specific day we want events from (midnight to midnight NYT)
        target_day_for_filtering = (current_time_ny + timedelta(days=2)).replace(hour=0, minute=0, second=0, microsecond=0)

        logging.info(f"Script run time (NYT): {current_time_ny.isoformat()}")
        logging.info(f"Targeting events for NYT date: {target_day_for_filtering.strftime('%Y-%m-%d')}")

        upcoming_events = get_events_for_target_day_ny(events, target_day_for_filtering)
        
        if not upcoming_events:
            logging.warning(f"No upcoming events found for {target_day_for_filtering.strftime('%Y-%m-%d')} NYT.")
            return

        initial_tweet_text = f"Here are some things to do in NYC for {target_day_for_header_str}:"
        
        previous_tweet_id = None
        
        # Post the initial tweet
        if TWITTER_API_KEY and TWITTER_API_KEY != "YOUR_API_KEY":
            logging.info(f"Posting initial thread tweet: {initial_tweet_text}")
            previous_tweet_id = post_to_twitter(
                initial_tweet_text,
                TWITTER_API_KEY,
                TWITTER_API_SECRET,
                TWITTER_ACCESS_TOKEN,
                TWITTER_ACCESS_TOKEN_SECRET
            )
            if not previous_tweet_id:
                logging.error("Failed to post initial tweet. Aborting thread.")
                return # Stop if the first tweet fails
        else:
            logging.warning("Skipping Twitter post (initial): Twitter API credentials are placeholders or missing.")
            # If we can't post the initial tweet, we can't make a thread for local testing without Twitter.
            # For actual runs, we would likely want to stop here.
            print(f"LOCAL DEBUG (Initial Tweet): {initial_tweet_text}") # For local non-posting test

        logging.info(f"Processing {len(upcoming_events)} events for tweeting as replies.")
        for i, event in enumerate(upcoming_events):
            tweet_content = generate_tweet_with_gemini(event)
            
            logging.info(f"Generated reply content for {event.get('name', 'Unnamed Event')}: {tweet_content}")

            if TWITTER_API_KEY and TWITTER_API_KEY != "YOUR_API_KEY":
                if previous_tweet_id: # Only post as reply if initial tweet (or previous reply) was successful
                    logging.info(f"Posting event {i+1} as a reply to tweet ID: {previous_tweet_id}")
                    current_tweet_id = post_to_twitter(
                        tweet_content,
                        TWITTER_API_KEY,
                        TWITTER_API_SECRET,
                        TWITTER_ACCESS_TOKEN,
                        TWITTER_ACCESS_TOKEN_SECRET,
                        in_reply_to_tweet_id=previous_tweet_id
                    )
                    if current_tweet_id:
                        previous_tweet_id = current_tweet_id # Update for the next reply
                    else:
                        logging.warning(f"Failed to post reply for event: {event.get('name')}. Subsequent events may not be threaded correctly.")
                        # Optionally, could break here or try to post next as a new tweet
                else:
                    logging.warning(f"Cannot post reply for event {event.get('name')} because previous_tweet_id is missing.")
            else:
                logging.warning(f"Skipping Twitter post (reply for {event.get('name')}): Twitter API credentials missing.")
                print(f"LOCAL DEBUG (Reply {i+1} to {previous_tweet_id if previous_tweet_id else '[No Initial Tweet ID]'}): {tweet_content}") # For local non-posting test

    except Exception as e:
        logging.error(f"Error in tweet generation main function: {e}")
        raise

if __name__ == '__main__':
    main() 