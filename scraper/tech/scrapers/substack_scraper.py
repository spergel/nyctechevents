import json
import aiohttp
import asyncio
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Dict, Any, Optional
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from urllib.parse import urlparse
import os

# Setup paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TECH_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(TECH_DIR, 'data')

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

class SubstackPost:
    """Model class for a Substack post"""
    def __init__(self, id, title, subtitle, publication, url, post_date, description, cover_image, excerpt, metadata, type="article"):
        self.id = id
        self.title = title
        self.subtitle = subtitle
        self.publication = publication
        self.url = url
        self.post_date = post_date
        self.description = description
        self.cover_image = cover_image
        self.excerpt = excerpt
        self.type = type
        self.metadata = metadata

class SubstackScraper:
    def __init__(self):
        self.source_name = "substack"
        self.six_months_ago = datetime.now(timezone.utc) - timedelta(days=180)
        self.output_dir = Path(DATA_DIR)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.output_file = self.output_dir / "substack_events.json"
        self.substack_data = self.load_substack_data()

    def load_substack_data(self) -> List[Dict]:
        """Loads Substack data from data/substacks.json."""
        try:
            substack_config = os.path.join(DATA_DIR, "substacks.json")
            with open(substack_config, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if 'substacks' in data and isinstance(data['substacks'], list):
                    return data['substacks']
                else:
                    logging.error("The 'substacks' key is missing or not a list in substacks.json.")
                    return []
        except Exception as e:
            logging.error(f"Error loading Substack data: {str(e)}")
            return []

    def get_feed_url(self, publication_data: Dict[str, str]) -> str:
        """Construct the appropriate feed URL based on the publication URL."""
        url = publication_data['url'].rstrip('/')
        parsed_url = urlparse(url)
        
        # Handle different URL patterns
        if 'substack.com' in parsed_url.netloc:
            # Standard Substack URL
            return f"{url}/feed"
        elif parsed_url.netloc.endswith('.nyc'):
            # Special case for .nyc domains (might be Substack)
            if not url.startswith('http'):
                url = f"https://{url}"
            return f"{url}/feed"
        else:
            # For non-Substack URLs, try to find RSS feed
            return f"{url}/rss" if not url.endswith('/rss') else url

    def extract_cover_image(self, description: str) -> str:
        """Extract cover image URL from description if present."""
        if not description:
            return ""
        try:
            # Look for first image in the description
            img_start = description.find('<img')
            if img_start != -1:
                src_start = description.find('src="', img_start)
                if src_start != -1:
                    src_start += 5  # len('src="')
                    src_end = description.find('"', src_start)
                    if src_end != -1:
                        return description[src_start:src_end]
        except Exception:
            pass
        return ""

    def clean_html(self, text: str) -> str:
        """Remove HTML tags from text."""
        if not text:
            return ""
        try:
            # Simple HTML tag removal
            import re
            clean = re.compile('<.*?>')
            return re.sub(clean, '', text).strip()
        except Exception:
            return text

    def generate_post_id(self, publication_id: str, post_guid: str) -> str:
        """Generate a unique ID for a post."""
        return f"post_{publication_id}_{post_guid}"

    async def fetch_publication_posts(self, session: aiohttp.ClientSession, publication_data: Dict[str, str]) -> List[SubstackPost]:
        """Fetch and parse posts from a single publication."""
        try:
            publication_id = publication_data['id']
            publication_name = publication_data['name']
            feed_url = self.get_feed_url(publication_data)
            
            logging.info(f"Fetching feed for {publication_name} from {feed_url}")
            
            async with session.get(feed_url) as response:
                if response.status == 200:
                    feed_text = await response.text()
                    try:
                        root = ET.fromstring(feed_text)
                    except ET.ParseError as e:
                        logging.error(f"Failed to parse feed for {publication_name}: {str(e)}")
                        return []
                    
                    posts = []
                    for item in root.findall(".//item"):
                        try:
                            # Get post date
                            pub_date = item.find("pubDate")
                            if pub_date is not None:
                                post_date = parsedate_to_datetime(pub_date.text)
                                # Skip if older than 6 months
                                if post_date < self.six_months_ago:
                                    continue
                            else:
                                continue
                            
                            # Get description and clean it
                            description = item.find("description").text if item.find("description") is not None else ""
                            clean_description = self.clean_html(description)
                            
                            # Create post
                            post = SubstackPost(
                                id=self.generate_post_id(
                                    publication_id,
                                    item.find('guid').text.split('/')[-1] if item.find("guid") is not None else ""
                                ),
                                title=item.find("title").text if item.find("title") is not None else "",
                                subtitle="",  # Substack RSS doesn't include subtitles
                                publication=publication_id,
                                url=item.find("link").text if item.find("link") is not None else "",
                                post_date=post_date,
                                description=clean_description,
                                cover_image=self.extract_cover_image(description),
                                excerpt=clean_description[:200] + "..." if len(clean_description) > 200 else clean_description,
                                metadata={
                                    "source": publication_data['url'],
                                    "description": publication_data.get('description', ''),
                                    "publication_name": publication_name
                                }
                            )
                            
                            posts.append(post)
                            
                        except Exception as e:
                            logging.warning(f"Error processing post from {publication_name}: {str(e)}")
                            continue
                    
                    logging.info(f"Successfully fetched {len(posts)} posts from {publication_name}")
                    return posts
                else:
                    logging.error(f"Failed to fetch posts from {publication_name}. Status: {response.status}")
                    return []
        except Exception as e:
            logging.error(f"Error fetching posts from {publication_name}: {str(e)}")
            return []

    async def scrape_posts(self) -> List[SubstackPost]:
        """Scrape posts from all Substack publications."""
        logging.info("Starting substack scraper...")
        
        async def run_scraper():
            try:
                timeout = aiohttp.ClientTimeout(total=30)  # 30 seconds timeout
                async with aiohttp.ClientSession(timeout=timeout) as session:
                    tasks = []
                    for publication in self.substack_data:
                        tasks.append(self.fetch_publication_posts(session, publication))
                    results = await asyncio.gather(*tasks, return_exceptions=True)
                    
                    all_posts = []
                    for posts in results:
                        if isinstance(posts, list):
                            all_posts.extend(posts)
                    return all_posts
            except Exception as e:
                logging.error(f"Error in scraper: {str(e)}")
                return []

        try:
            posts = await run_scraper()
            
            # Save posts to file
            posts_data = [
                {
                    "id": post.id,
                    "title": post.title,
                    "subtitle": post.subtitle,
                    "publication": post.publication,
                    "url": post.url,
                    "post_date": post.post_date.isoformat(),
                    "description": post.description,
                    "cover_image": post.cover_image,
                    "excerpt": post.excerpt,
                    "type": post.type,
                    "metadata": post.metadata
                }
                for post in posts
            ]
            
            # Convert posts to events format
            events = []
            for post in posts_data:
                event = {
                    "id": post["id"],
                    "name": post["title"],
                    "type": "Tech Event",
                    "description": post["description"],
                    "startDate": post["post_date"],
                    "endDate": None,
                    "locationId": f"loc_{post['publication']}",
                    "communityId": f"com_{post['publication']}",
                    "category": ["Tech", "Article"],
                    "tags": ["tech", "newsletter", "substack"],
                    "price": {
                        "amount": 0,
                        "type": "Free",
                        "currency": "USD"
                    },
                    "metadata": post["metadata"]
                }
                events.append(event)
            
            with open(self.output_file, 'w', encoding='utf-8') as f:
                json.dump({"events": events}, f, indent=2, ensure_ascii=False)
            
            logging.info(f"Successfully saved {len(events)} events to {self.output_file}")
            return str(self.output_file)
            
        except Exception as e:
            logging.error(f"Error running scraper: {str(e)}")
            return None

    def run(self):
        """Run the scraper and return the output file path."""
        # Create empty substacks.json if it doesn't exist
        substacks_file = os.path.join(DATA_DIR, "substacks.json")
        if not os.path.exists(substacks_file):
            with open(substacks_file, 'w', encoding='utf-8') as f:
                json.dump({"substacks": [
                    {
                        "id": "sample_substack",
                        "name": "Sample Substack",
                        "url": "https://example.substack.com",
                        "description": "Sample Substack for testing"
                    }
                ]}, f, indent=2)
            logging.info(f"Created default substacks.json at {substacks_file}")
        
        # Run the scraper
        if not self.substack_data:
            logging.error("No Substack data available. Please check substacks.json")
            return None
            
        # For asyncio
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        return loop.run_until_complete(self.scrape_posts())

def main():
    scraper = SubstackScraper()
    return scraper.run()

if __name__ == "__main__":
    main()