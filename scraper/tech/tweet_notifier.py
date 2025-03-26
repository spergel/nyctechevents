import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path
from datetime import datetime

# Setup paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TWEETS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(SCRIPT_DIR))), 'tech', 'tweets')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def get_latest_tweet_file():
    """Get the most recent tweet HTML file."""
    try:
        tweet_files = list(Path(TWEETS_DIR).glob('tweets_*.html'))
        if not tweet_files:
            logging.error("No tweet files found")
            return None
            
        # Sort by modification time (newest first)
        latest_file = max(tweet_files, key=lambda f: f.stat().st_mtime)
        return latest_file
    except Exception as e:
        logging.error(f"Error finding latest tweet file: {e}")
        return None

def send_email_notification(html_content, recipient_email):
    """Send email with the tweet HTML content."""
    try:
        # Get email credentials from environment
        sender_email = os.environ.get('EMAIL_SENDER')
        sender_password = os.environ.get('EMAIL_PASSWORD')
        
        if not sender_email or not sender_password:
            logging.error("Email credentials not found in environment variables")
            return False
            
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f'NYC Tech Events - Latest Tweets ({datetime.now().strftime("%Y-%m-%d")})'
        msg['From'] = sender_email
        msg['To'] = recipient_email
        
        # Attach HTML content
        html_part = MIMEText(html_content, 'html')
        msg.attach(html_part)
        
        # Send email
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(sender_email, sender_password)
            server.send_message(msg)
            
        logging.info(f"Email notification sent to {recipient_email}")
        return True
        
    except Exception as e:
        logging.error(f"Error sending email notification: {e}")
        return False

def main():
    """Main function to send tweet notifications."""
    try:
        # Get recipient email from environment
        recipient_email = os.environ.get('TWEET_RECIPIENT_EMAIL')
        if not recipient_email:
            logging.error("Recipient email not found in environment variables")
            return
            
        # Get latest tweet file
        tweet_file = get_latest_tweet_file()
        if not tweet_file:
            return
            
        # Read HTML content
        with open(tweet_file, 'r', encoding='utf-8') as f:
            html_content = f.read()
            
        # Send email notification
        send_email_notification(html_content, recipient_email)
        
    except Exception as e:
        logging.error(f"Error in tweet notification: {e}")
        raise

if __name__ == '__main__':
    main() 