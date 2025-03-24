import os
import tweepy
import logging
from datetime import datetime
import requests
import tempfile

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def post_tweet_with_media(text, image_url=None):
    """Post a tweet with media using the Twitter API v1.1 with existing credentials"""
    
    # Get credentials from environment variables
    api_key = os.environ.get('TWITTER_API_KEY')
    api_secret = os.environ.get('TWITTER_API_SECRET')
    access_token = os.environ.get('TWITTER_ACCESS_TOKEN')
    access_token_secret = os.environ.get('TWITTER_ACCESS_TOKEN_SECRET')
    
    # Check if all credentials are available
    if not all([api_key, api_secret, access_token, access_token_secret]):
        logger.error("Missing required Twitter API credentials")
        return False
    
    logger.info(f"Attempting to post tweet with media: {text}")
    
    try:
        # Authenticate with Twitter using OAuth 1.0a
        auth = tweepy.OAuth1UserHandler(
            api_key, api_secret, access_token, access_token_secret
        )
        
        # Create API object
        api = tweepy.API(auth)
        
        # If no image_url is provided, use a default image
        if not image_url:
            image_url = "https://images.unsplash.com/photo-1496588152823-86ff7695e68f?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            logger.info(f"Using default image: {image_url}")
        
        # Download the image to a temporary file
        temp_file = None
        try:
            # Get the image
            logger.info(f"Downloading image from {image_url}")
            response = requests.get(image_url, stream=True)
            if response.status_code == 200:
                # Create a temporary file
                temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg")
                for chunk in response.iter_content(1024):
                    temp_file.write(chunk)
                temp_file.close()
                
                # Upload the media to Twitter
                logger.info(f"Uploading media to Twitter from {temp_file.name}")
                media = api.media_upload(temp_file.name)
                
                # Post the tweet with media
                logger.info("Posting tweet with media")
                status = api.update_status(
                    status=text,
                    media_ids=[media.media_id]
                )
                logger.info(f"Successfully posted tweet with ID: {status.id}")
                return True
            else:
                logger.error(f"Failed to download image. Status code: {response.status_code}")
                return False
                
        finally:
            # Clean up the temporary file
            if temp_file and os.path.exists(temp_file.name):
                os.unlink(temp_file.name)
                logger.info(f"Deleted temporary file: {temp_file.name}")
    
    except Exception as e:
        logger.error(f"Failed to post tweet with media: {str(e)}")
        
        # Try alternative method with v2 API
        try:
            logger.info("Trying with v2 API...")
            
            # For v2 API, we need to upload media first using v1.1
            temp_file = None
            try:
                # Get the image
                response = requests.get(image_url, stream=True)
                if response.status_code == 200:
                    # Create a temporary file
                    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg")
                    for chunk in response.iter_content(1024):
                        temp_file.write(chunk)
                    temp_file.close()
                    
                    # Upload media using v1.1 API
                    media = api.media_upload(temp_file.name)
                    
                    # Create client for v2 API
                    client = tweepy.Client(
                        consumer_key=api_key,
                        consumer_secret=api_secret,
                        access_token=access_token,
                        access_token_secret=access_token_secret
                    )
                    
                    # Post tweet with media using v2 API
                    response = client.create_tweet(
                        text=text,
                        media_ids=[media.media_id]
                    )
                    
                    if response and response.data:
                        logger.info(f"Successfully posted tweet with ID: {response.data['id']}")
                        return True
                    else:
                        logger.error("Failed to post tweet with v2 API")
                        return False
                else:
                    logger.error(f"Failed to download image. Status code: {response.status_code}")
                    return False
                    
            finally:
                # Clean up the temporary file
                if temp_file and os.path.exists(temp_file.name):
                    os.unlink(temp_file.name)
            
        except Exception as e2:
            logger.error(f"Failed to post tweet with v2 API: {str(e2)}")
            return False

if __name__ == "__main__":
    # Test tweet
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    test_tweet = f"Testing NYC Events Twitter integration with media at {timestamp} #nyc #events"
    
    # Example image of NYC skyline
    image_url = "https://images.unsplash.com/photo-1496588152823-86ff7695e68f?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    
    result = post_tweet_with_media(test_tweet, image_url)
    
    if result:
        print("\n✅ Tweet with media posted successfully!")
        print("This confirms that the Twitter API free tier allows posting tweets WITH media.")
    else:
        print("\n❌ Failed to post tweet with media. Check the logs for details.")
        print("\nThis suggests that even the 'media post' endpoint is restricted in your current API tier.")
        print("Options:")
        print("1. Use the tweet generator script to create tweet files for manual posting")
        print("2. Upgrade to Twitter API Basic tier ($100/month)") 