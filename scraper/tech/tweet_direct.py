import os
import tweepy
import logging
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def post_tweet(text):
    """Post a tweet using the Twitter API v1.1 with existing credentials"""
    
    # Get credentials from environment variables
    api_key = os.environ.get('TWITTER_API_KEY')
    api_secret = os.environ.get('TWITTER_API_SECRET')
    access_token = os.environ.get('TWITTER_ACCESS_TOKEN')
    access_token_secret = os.environ.get('TWITTER_ACCESS_TOKEN_SECRET')
    
    # Check if all credentials are available
    if not all([api_key, api_secret, access_token, access_token_secret]):
        logger.error("Missing required Twitter API credentials")
        return False
    
    logger.info(f"Attempting to post tweet: {text}")
    
    try:
        # Authenticate with Twitter using OAuth 1.0a
        auth = tweepy.OAuth1UserHandler(
            api_key, api_secret, access_token, access_token_secret
        )
        
        # Create API object
        api = tweepy.API(auth)
        
        # Post the tweet
        status = api.update_status(text)
        logger.info(f"Successfully posted tweet with ID: {status.id}")
        return True
    
    except Exception as e:
        logger.error(f"Failed to post tweet: {str(e)}")
        
        # Try alternative method with v2 API
        try:
            logger.info("Trying with v2 API...")
            client = tweepy.Client(
                consumer_key=api_key,
                consumer_secret=api_secret,
                access_token=access_token,
                access_token_secret=access_token_secret
            )
            
            response = client.create_tweet(text=text)
            if response and response.data:
                logger.info(f"Successfully posted tweet with ID: {response.data['id']}")
                return True
            else:
                logger.error("Failed to post tweet with v2 API")
                return False
        
        except Exception as e2:
            logger.error(f"Failed to post tweet with v2 API: {str(e2)}")
            return False

if __name__ == "__main__":
    # Test tweet
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    test_tweet = f"Testing NYC Events Twitter integration at {timestamp} #test"
    
    result = post_tweet(test_tweet)
    
    if result:
        print("\n✅ Tweet posted successfully!")
    else:
        print("\n❌ Failed to post tweet. Check the logs for details.")
        print("\nThis is likely due to Twitter's API limitations.")
        print("Twitter's free tier doesn't allow posting tweets programmatically.")
        print("Options:")
        print("1. Use the tweet generator script to create tweet files for manual posting")
        print("2. Upgrade to Twitter API Basic tier ($100/month)") 