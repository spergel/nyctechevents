import os
import json
import logging
import base64
import hashlib
import requests
import webbrowser
import time
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Twitter API v2 OAuth 2.0 with PKCE flow
class TwitterAuth:
    def __init__(self):
        self.client_id = os.environ.get('TWITTER_CLIENT_ID', 'NnJqX1BMbVg1S21qUUU5ZDlaRXE6MTpjaQ')
        self.client_secret = os.environ.get('TWITTER_CLIENT_SECRET', 'QN7xCgHzUM4BLeUOV0bQEFqUEqxDtJd1u9Ve4qpV3qlP-w4Svv')
        # Use the exact same redirect URI as configured in your Twitter Developer Portal
        self.redirect_uri = "https://localhost:3000"
        self.auth_url = "https://twitter.com/i/oauth2/authorize"
        self.token_url = "https://api.twitter.com/2/oauth2/token"
        self.scope = "tweet.read tweet.write users.read offline.access"
        
    def generate_code_verifier(self):
        code_verifier = base64.urlsafe_b64encode(os.urandom(40)).decode('utf-8')
        return code_verifier.replace('=', '')
        
    def generate_code_challenge(self, code_verifier):
        code_challenge = hashlib.sha256(code_verifier.encode('utf-8')).digest()
        code_challenge = base64.urlsafe_b64encode(code_challenge).decode('utf-8')
        return code_challenge.replace('=', '')
        
    def get_authorization_url(self, code_challenge):
        params = {
            'response_type': 'code',
            'client_id': self.client_id,
            'redirect_uri': self.redirect_uri,
            'scope': self.scope,
            'state': 'state',
            'code_challenge': code_challenge,
            'code_challenge_method': 'S256'
        }
        
        auth_url = f"{self.auth_url}?"
        auth_url += "&".join([f"{k}={v}" for k, v in params.items()])
        return auth_url
        
    def get_user_authorization(self, code_challenge):
        auth_url = self.get_authorization_url(code_challenge)
        print("\n===== TWITTER AUTHENTICATION INSTRUCTIONS =====")
        print(f"1. Open this URL in your browser: {auth_url}")
        print(f"2. Log in to Twitter if prompted")
        print(f"3. Authorize the app")
        print(f"4. After authorization, you'll be redirected to {self.redirect_uri}")
        print(f"5. You'll see a connection error - that's OK! Copy the FULL URL from your browser address bar")
        print(f"6. Paste the URL below (it should contain 'code=')")
        print("============================================\n")
        
        # Try to open the browser automatically
        try:
            webbrowser.open(auth_url)
            print("Browser opened automatically. If not, please copy and paste the URL above.")
        except:
            print("Could not open browser automatically. Please copy and paste the URL above.")
        
        callback_url = input("\nEnter the full callback URL: ")
        return callback_url
        
    def extract_code_from_callback(self, callback_url):
        if "code=" not in callback_url:
            raise ValueError("The callback URL doesn't contain an authorization code. Make sure you're copying the full URL from your browser.")
            
        code_start = callback_url.find("code=") + 5
        code_end = callback_url.find("&", code_start) if "&" in callback_url[code_start:] else len(callback_url)
        return callback_url[code_start:code_end]
        
    def get_access_token(self, authorization_code, code_verifier):
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
        
        data = {
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'grant_type': 'authorization_code',
            'code': authorization_code,
            'redirect_uri': self.redirect_uri,
            'code_verifier': code_verifier
        }
        
        print("\nRequesting access token from Twitter...\n")
        response = requests.post(self.token_url, headers=headers, data=data)
        
        if response.status_code == 200:
            token_data = response.json()
            print("Successfully obtained access token!")
            return token_data
        else:
            logger.error(f"Failed to get access token. Status code: {response.status_code}")
            logger.error(f"Response: {response.text}")
            return None
            
class TwitterAPI:
    def __init__(self, access_token):
        self.access_token = access_token
        self.api_url = "https://api.twitter.com/2"
        
    def post_tweet(self, text):
        url = f"{self.api_url}/tweets"
        
        headers = {
            'Authorization': f"Bearer {self.access_token}",
            'Content-Type': 'application/json'
        }
        
        payload = {
            'text': text
        }
        
        print(f"\nAttempting to post tweet: {text}\n")
        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code == 201:
            logger.info("Tweet posted successfully!")
            return response.json()
        else:
            logger.error(f"Failed to post tweet. Status code: {response.status_code}")
            logger.error(f"Response: {response.text}")
            return None
            
def main():
    # Test tweet
    test_tweet = f"Testing NYC Events Twitter integration at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} #test"
    logger.info(f"Posting test tweet: {test_tweet}")
    
    try:
        # Initialize Twitter OAuth flow
        twitter_auth = TwitterAuth()
        
        # Generate code verifier and challenge
        code_verifier = twitter_auth.generate_code_verifier()
        code_challenge = twitter_auth.generate_code_challenge(code_verifier)
        
        # Get user authorization
        callback_url = twitter_auth.get_user_authorization(code_challenge)
        
        # Extract authorization code from callback URL
        authorization_code = twitter_auth.extract_code_from_callback(callback_url)
        print(f"Successfully extracted authorization code!")
        
        # Get access token
        token_data = twitter_auth.get_access_token(authorization_code, code_verifier)
        
        if token_data:
            access_token = token_data['access_token']
            
            # Initialize Twitter API
            twitter_api = TwitterAPI(access_token)
            
            # Post tweet
            result = twitter_api.post_tweet(test_tweet)
            
            if result:
                logger.info(f"Tweet posted with ID: {result.get('data', {}).get('id')}")
                logger.info("Save your tokens for future use:")
                logger.info(f"Access Token: {access_token}")
                logger.info(f"Refresh Token: {token_data.get('refresh_token', 'N/A')}")
                logger.info(f"Expires In: {token_data.get('expires_in', 'N/A')} seconds")
                
                # Save tokens to file
                with open("twitter_tokens.json", "w") as f:
                    json.dump(token_data, f, indent=4)
                logger.info("Tokens saved to twitter_tokens.json")
        else:
            logger.error("Failed to get access token from Twitter")
            
    except Exception as e:
        logger.error(f"Error: {e}")
        
if __name__ == "__main__":
    main() 