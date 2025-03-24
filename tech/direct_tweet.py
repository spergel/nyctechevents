import os
import requests
import json
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def post_tweet(text):
    """Post a tweet using the Twitter API v2 endpoint directly"""
    url = "https://api.twitter.com/2/tweets"
    
    # Get credentials
    api_key = os.environ.get('TWITTER_API_KEY')
    api_secret = os.environ.get('TWITTER_API_SECRET')
    access_token = os.environ.get('TWITTER_ACCESS_TOKEN')
    access_token_secret = os.environ.get('TWITTER_ACCESS_TOKEN_SECRET')
    
    if not all([api_key, api_secret, access_token, access_token_secret]):
        raise ValueError("Missing required Twitter API credentials")
    
    # Generate OAuth 1.0a headers
    import oauth2 as oauth
    import time
    
    consumer = oauth.Consumer(key=api_key, secret=api_secret)
    token = oauth.Token(key=access_token, secret=access_token_secret)
    
    # Create OAuth request
    oauth_client = oauth.Client(consumer, token)
    
    # Create payload
    payload = {
        "text": text
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    resp, content = oauth_client.request(
        url,
        method="POST",
        body=json.dumps(payload).encode("utf-8"),
        headers=headers
    )
    
    logger.info(f"Status: {resp.status}")
    logger.info(f"Response: {content.decode('utf-8')}")
    
    if resp.status == 201:
        logger.info("Tweet posted successfully!")
        return json.loads(content.decode('utf-8'))
    else:
        logger.error(f"Failed to post tweet. Status: {resp.status}")
        logger.error(f"Error: {content.decode('utf-8')}")
        return None

if __name__ == "__main__":
    # Test tweet
    test_tweet = f"Testing NYC Events Twitter integration at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
    logger.info(f"Posting test tweet: {test_tweet}")
    
    try:
        result = post_tweet(test_tweet)
        if result:
            logger.info(f"Tweet posted with ID: {result.get('data', {}).get('id')}")
    except Exception as e:
        logger.error(f"Error posting tweet: {e}")
        
        # Try fallback method
        logger.info("Trying fallback method with requests...")
        
        try:
            import base64
            import requests
            
            # Get credentials
            api_key = os.environ.get('TWITTER_API_KEY')
            api_secret = os.environ.get('TWITTER_API_SECRET')
            access_token = os.environ.get('TWITTER_ACCESS_TOKEN')
            access_token_secret = os.environ.get('TWITTER_ACCESS_TOKEN_SECRET')
            
            # First get a bearer token
            credentials = f"{api_key}:{api_secret}"
            encoded_credentials = base64.b64encode(credentials.encode('utf-8')).decode('utf-8')
            
            auth_url = "https://api.twitter.com/oauth2/token"
            auth_headers = {
                "Authorization": f"Basic {encoded_credentials}",
                "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
            }
            auth_data = "grant_type=client_credentials"
            
            auth_resp = requests.post(auth_url, headers=auth_headers, data=auth_data)
            
            if auth_resp.status_code == 200:
                bearer_token = auth_resp.json().get("access_token")
                logger.info("Successfully obtained bearer token")
                
                # Now post the tweet
                tweet_url = "https://api.twitter.com/2/tweets"
                tweet_headers = {
                    "Authorization": f"Bearer {bearer_token}",
                    "Content-Type": "application/json"
                }
                tweet_data = {"text": test_tweet}
                
                tweet_resp = requests.post(tweet_url, headers=tweet_headers, json=tweet_data)
                
                logger.info(f"Status code: {tweet_resp.status_code}")
                logger.info(f"Response: {tweet_resp.text}")
                
                if tweet_resp.status_code == 201:
                    logger.info("Tweet posted successfully with fallback method!")
                else:
                    logger.error(f"Failed to post tweet with fallback method. Status: {tweet_resp.status_code}")
            else:
                logger.error(f"Failed to obtain bearer token. Status: {auth_resp.status_code}")
                logger.error(f"Error: {auth_resp.text}")
        
        except Exception as e2:
            logger.error(f"Error using fallback method: {e2}")
            
            # One last attempt with tweepy
            logger.info("Trying one last method with tweepy...")
            
            try:
                import tweepy
                
                # Create client with v2 endpoint
                client = tweepy.Client(
                    consumer_key=api_key,
                    consumer_secret=api_secret,
                    access_token=access_token,
                    access_token_secret=access_token_secret
                )
                
                # Post tweet
                response = client.create_tweet(text=test_tweet)
                logger.info(f"Response: {response}")
                if response and response.data:
                    logger.info(f"Tweet posted with ID: {response.data['id']}")
                else:
                    logger.error("Failed to post tweet with tweepy")
            
            except Exception as e3:
                logger.error(f"Error using tweepy: {e3}")
                
                # Dump detailed error info
                if hasattr(e3, 'response') and hasattr(e3.response, 'text'):
                    logger.error(f"Detailed error: {e3.response.text}")
                
                # Print Twitter API credentials diagnostics (without revealing secrets)
                logger.info(f"API Key available: {bool(api_key)}")
                logger.info(f"API Secret available: {bool(api_secret)}")
                logger.info(f"Access Token available: {bool(access_token)}")
                logger.info(f"Access Token Secret available: {bool(access_token_secret)}") 