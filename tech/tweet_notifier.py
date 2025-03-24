import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime
import logging
import glob

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def send_tweet_email(recipient_email, html_file_path):
    """
    Send an email with tweet content to the specified recipient
    
    Args:
        recipient_email: The email address to send to
        html_file_path: Path to the HTML tweet file
    """
    # Get email credentials from environment variables
    sender_email = os.environ.get('EMAIL_SENDER')
    sender_password = os.environ.get('EMAIL_PASSWORD')
    smtp_server = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
    smtp_port = int(os.environ.get('SMTP_PORT', '587'))
    
    if not all([sender_email, sender_password]):
        logger.error("Missing email credentials. Set EMAIL_SENDER and EMAIL_PASSWORD environment variables.")
        return False
    
    try:
        # Read the HTML file
        with open(html_file_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        # Create the email message
        msg = MIMEMultipart('alternative')
        
        # Get date from filename or current date
        date_str = datetime.now().strftime('%Y-%m-%d')
        if 'tweets_' in html_file_path:
            try:
                filename = os.path.basename(html_file_path)
                date_part = filename.split('_')[0].replace('tweets_', '')
                date_obj = datetime.strptime(date_part, '%Y%m%d')
                date_str = date_obj.strftime('%Y-%m-%d')
            except:
                # If we can't parse the date from filename, use tomorrow's date
                date_str = (datetime.now() + datetime.timedelta(days=1)).strftime('%Y-%m-%d')
        
        msg['Subject'] = f'NYC Events Tweets for {date_str}'
        msg['From'] = sender_email
        msg['To'] = recipient_email
        
        # Create a simple text version
        text_content = "Tweets for NYC Events have been generated. Please see the HTML version for better formatting."
        
        # Attach parts
        part1 = MIMEText(text_content, 'plain')
        part2 = MIMEText(html_content, 'html')
        
        msg.attach(part1)
        msg.attach(part2)
        
        # Connect to the SMTP server
        logger.info(f"Connecting to SMTP server {smtp_server}:{smtp_port}")
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        
        # Login and send email
        logger.info(f"Logging in as {sender_email}")
        server.login(sender_email, sender_password)
        
        logger.info(f"Sending email to {recipient_email}")
        server.sendmail(sender_email, recipient_email, msg.as_string())
        server.quit()
        
        logger.info(f"Email sent successfully to {recipient_email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        return False

def notify_tweets_generated(recipient_email):
    """
    Find the latest tweet files and send them via email
    
    Args:
        recipient_email: The email address to send to
    """
    try:
        # Find the latest tweet files
        tweets_dir = os.path.join('tech', 'tweets')
        if not os.path.exists(tweets_dir):
            logger.error(f"Tweets directory not found: {tweets_dir}")
            return False
            
        # List all files in the directory
        html_files = glob.glob(os.path.join(tweets_dir, 'tweets_*.html'))
        
        if not html_files:
            logger.error("No HTML tweet files found")
            return False
            
        # Sort by modification time (newest first)
        html_files.sort(key=os.path.getmtime, reverse=True)
        
        # Get the latest file
        latest_html = html_files[0]
        
        logger.info(f"Found latest HTML file: {latest_html}")
            
        # Send the email
        return send_tweet_email(recipient_email, latest_html)
        
    except Exception as e:
        logger.error(f"Failed to notify about tweets: {str(e)}")
        return False

if __name__ == "__main__":
    # Set default recipient email to your address
    recipient_email = "spergel.joshua@gmail.com"
    
    # Override with environment variable if available
    if os.environ.get('TWEET_RECIPIENT_EMAIL'):
        recipient_email = os.environ.get('TWEET_RECIPIENT_EMAIL')
    
    success = notify_tweets_generated(recipient_email)
    
    if success:
        print("\n✅ Tweet notification email sent successfully!")
    else:
        print("\n❌ Failed to send tweet notification email. Check the logs for details.") 