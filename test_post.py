import os
import tweepy
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Set up authentication directly
consumer_key = os.environ.get('TWITTER_API_KEY')
consumer_secret = os.environ.get('TWITTER_API_SECRET')
access_token = os.environ.get('TWITTER_ACCESS_TOKEN')
access_token_secret = os.environ.get('TWITTER_ACCESS_TOKEN_SECRET')
bearer_token = os.environ.get('TWITTER_BEARER_TOKEN')

logger.info(f"API Key available: {bool(consumer_key)}")
logger.info(f"API Secret available: {bool(consumer_secret)}")
logger.info(f"Access Token available: {bool(access_token)}")
logger.info(f"Access Token Secret available: {bool(access_token_secret)}")
logger.info(f"Bearer Token available: {bool(bearer_token)}")

try:
    # Method 1: Using OAuth 1.0a through the legacy API
    logger.info("Trying to authenticate with tweepy.OAuth1UserHandler...")
    auth = tweepy.OAuth1UserHandler(
        consumer_key, 
        consumer_secret,
        access_token, 
        access_token_secret
    )
    api = tweepy.API(auth)
    
    # Test the connection
    logger.info("Testing API connection...")
    me = api.verify_credentials()
    logger.info(f"Connected to Twitter as: @{me.screen_name}")
    
    # Try to post directly with API v1.1
    logger.info("Trying to post using API v1.1...")
    tweet = api.update_status("Test tweet from NYC Events app using v1.1 API")
    logger.info(f"Successfully posted tweet: {tweet.id}")
    
except Exception as e:
    logger.error(f"Method 1 failed: {str(e)}")
    
    try:
        # Method 2: Using Client (API v2)
        logger.info("Trying to authenticate with tweepy.Client...")
        client = tweepy.Client(
            bearer_token=bearer_token,
            consumer_key=consumer_key,
            consumer_secret=consumer_secret,
            access_token=access_token,
            access_token_secret=access_token_secret
        )
        
        # Try to post using the v2 API
        logger.info("Trying to post using API v2...")
        response = client.create_tweet(text="Test tweet from NYC Events app using v2 API")
        logger.info(f"Successfully posted tweet: {response.data['id']}")
        
    except Exception as e:
        logger.error(f"Method 2 failed: {str(e)}")
        
        if hasattr(e, 'response') and hasattr(e.response, 'text'):
            logger.error(f"Error response: {e.response.text}") 