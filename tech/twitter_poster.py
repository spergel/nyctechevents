import os
import json
import tweepy
from datetime import datetime, timedelta
import logging
import pyshorteners
from dateutil import parser
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_twitter_client():
    """Initialize and return Twitter API client, optimized for limited API access"""
    api_key = os.environ.get('TWITTER_API_KEY')
    api_secret = os.environ.get('TWITTER_API_SECRET')
    access_token = os.environ.get('TWITTER_ACCESS_TOKEN')
    access_token_secret = os.environ.get('TWITTER_ACCESS_TOKEN_SECRET')
    
    if not all([api_key, api_secret, access_token, access_token_secret]):
        logger.error("Missing required Twitter API credentials")
        raise ValueError("Missing required Twitter API credentials")
    
    logger.info("Setting up Twitter client with OAuth 1.0a")
    
    # Use v1.1 API for posting as that might have different rate limits
    auth = tweepy.OAuth1UserHandler(
        api_key, api_secret, access_token, access_token_secret
    )
    api = tweepy.API(auth)
    
    # Also create the v2 client as fallback
    client = tweepy.Client(
        consumer_key=api_key,
        consumer_secret=api_secret,
        access_token=access_token,
        access_token_secret=access_token_secret
    )
    
    return api, client

def shorten_url(url):
    """Shorten URL using TinyURL"""
    try:
        s = pyshorteners.Shortener()
        return s.tinyurl.short(url)
    except Exception as e:
        logger.warning(f"Failed to shorten URL: {e}")
        return url

def format_event_tweet(event):
    """Format a single event for Twitter with a more narrative style"""
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

def post_daily_events():
    """Main function to post upcoming events to Twitter, optimized for rate limits"""
    try:
        api, client = get_twitter_client()
        events_file = os.path.join('public', 'data', 'events.json')
        
        upcoming_events = get_upcoming_events(events_file)
        if not upcoming_events:
            logger.info("No upcoming events found for the target date")
            return
        
        logger.info(f"Found {len(upcoming_events)} events to post")
        
        # Create thread for events
        target_date = (datetime.now() + timedelta(days=1))
        date_str = target_date.strftime('%A, %B %d')
        
        # We're limited to ~17 tweets per day, so we'll post up to 5 events max (1 intro + 4 events)
        # First try with v1.1 API
        try:
            logger.info(f"Attempting to post using Twitter API v1.1")
            
            # Post intro tweet
            intro_tweet = f"Here are some things to do {date_str} in New York"
            logger.info(f"Posting intro tweet: {intro_tweet}")
            
            tweet = api.update_status(intro_tweet)
            previous_tweet_id = tweet.id
            logger.info(f"Successfully posted intro tweet with ID: {previous_tweet_id}")
            
            # Post events as replies in thread
            event_count = min(4, len(upcoming_events))  # Limit to 4 events per day (plus intro = 5 total)
            for i, event in enumerate(upcoming_events[:event_count]):
                tweet_text = format_event_tweet(event)
                logger.info(f"Posting event {i+1}/{event_count}: {tweet_text[:50]}...")
                
                # Add a small delay between tweets to avoid rate limiting
                if i > 0:
                    time.sleep(2)
                
                tweet = api.update_status(
                    status=tweet_text,
                    in_reply_to_status_id=previous_tweet_id
                )
                previous_tweet_id = tweet.id
                logger.info(f"Successfully posted event {i+1} tweet with ID: {previous_tweet_id}")
                
            logger.info(f"Successfully posted {event_count} events to Twitter using v1.1 API")
            return
            
        except Exception as e:
            logger.warning(f"Failed to post with v1.1 API: {str(e)}")
            logger.info("Trying with v2 API instead...")
            
            # Fallback to v2 API
            try:
                # Post intro tweet
                intro_tweet = f"Here are some things to do {date_str} in New York"
                logger.info(f"Posting intro tweet: {intro_tweet}")
                
                response = client.create_tweet(text=intro_tweet)
                previous_tweet_id = response.data['id']
                logger.info(f"Successfully posted intro tweet with ID: {previous_tweet_id}")
                
                # Post events as replies in thread
                event_count = min(4, len(upcoming_events))  # Limit to 4 events per day (plus intro = 5 total)
                for i, event in enumerate(upcoming_events[:event_count]):
                    tweet_text = format_event_tweet(event)
                    logger.info(f"Posting event {i+1}/{event_count}: {tweet_text[:50]}...")
                    
                    # Add a small delay between tweets to avoid rate limiting
                    if i > 0:
                        time.sleep(2)
                    
                    response = client.create_tweet(
                        text=tweet_text,
                        in_reply_to_tweet_id=previous_tweet_id
                    )
                    previous_tweet_id = response.data['id']
                    logger.info(f"Successfully posted event {i+1} tweet with ID: {previous_tweet_id}")
                    
                logger.info(f"Successfully posted {event_count} events to Twitter using v2 API")
                
            except Exception as e:
                logger.error(f"Failed to post with v2 API: {str(e)}")
                if hasattr(e, 'response') and hasattr(e.response, 'text'):
                    logger.error(f"API error response: {e.response.text}")
                
                logger.error("""
                    Note about Twitter API access:
                    - Free tier has limits of ~17 posts per day
                    - Basic tier ($100/month) provides more access
                    - Check your rate limits at https://developer.x.com/en/portal/products
                """)
                raise
    
    except Exception as e:
        logger.error(f"Error in post_daily_events: {str(e)}")
        raise

if __name__ == "__main__":
    post_daily_events() 