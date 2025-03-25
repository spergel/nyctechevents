import os
import tweepy
import logging
import requests
import tempfile

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def upload_media_only():
    """Test uploading media to Twitter without posting"""
    
    # Get credentials from environment variables
    api_key = os.environ.get('TWITTER_API_KEY')
    api_secret = os.environ.get('TWITTER_API_SECRET')
    access_token = os.environ.get('TWITTER_ACCESS_TOKEN')
    access_token_secret = os.environ.get('TWITTER_ACCESS_TOKEN_SECRET')
    
    # Check if all credentials are available
    if not all([api_key, api_secret, access_token, access_token_secret]):
        logger.error("Missing required Twitter API credentials")
        return False
    
    logger.info("Testing media upload only (without posting a tweet)")
    
    try:
        # Authenticate with Twitter using OAuth 1.0a
        auth = tweepy.OAuth1UserHandler(
            api_key, api_secret, access_token, access_token_secret
        )
        
        # Create API object
        api = tweepy.API(auth)
        
        # Image URL
        image_url = "https://images.unsplash.com/photo-1496588152823-86ff7695e68f?w=500"
        
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
                
                logger.info(f"Successfully uploaded media with ID: {media.media_id}")
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
        logger.error(f"Failed to upload media: {str(e)}")
        return False

if __name__ == "__main__":
    result = upload_media_only()
    
    if result:
        print("\n✅ Media uploaded successfully!")
        print("This confirms that at least the media upload endpoint works in the free tier.")
        print("However, posting tweets still requires a paid API tier.")
    else:
        print("\n❌ Failed to upload media. Check the logs for details.")
        print("This suggests that your Twitter API access is very limited.")
        print("Options:")
        print("1. Use the tweet generator script to create tweet files for manual posting")
        print("2. Upgrade to Twitter API Basic tier ($100/month)") 