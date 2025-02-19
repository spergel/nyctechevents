import json
import aiohttp
import asyncio
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Dict, Any
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from urllib.parse import urlparse

# Setup logging
log_path = Path("logs")
log_path.mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    filename=log_path / "substack_scraper.log",
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

class SubstackScraper:
    def __init__(self):
        self.six_months_ago = datetime.now(timezone.utc) - timedelta(days=180)
        self.output_dir = Path("data")
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.output_file = self.output_dir / "substackposts.json"
        self.substack_data = self.load_substack_data()

    def load_substack_data(self) -> List[Dict]:
        """Loads Substack data from data/substacks.json."""
        try:
            with open("../../data/substacks.json", 'r', encoding='utf-8') as f:
                data = json.load(f)
                if 'substacks' in data and isinstance(data['substacks'], list):
                    return data['substacks']
                else:
                    logging.error("The 'substacks' key is missing or not a list in substacks.json.")
                    return []
        except FileNotFoundError:
            logging.error("File data/substacks.json not found.")
            return []
        except json.JSONDecodeError:
            logging.error("Error decoding JSON from data/substacks.json.")
            return []
        except Exception as e:
            logging.error(f"Error loading Substack data: {str(e)}")
            return []

    def get_feed_url(self, publication_data: Dict) -> str:
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

    async def fetch_publication_posts(self, session: aiohttp.ClientSession, publication_data: Dict) -> List[Dict[Any, Any]]:
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

                            description = item.find("description").text if item.find("description") is not None else ""
                            clean_description = self.clean_html(description)
                            
                            post = {
                                "id": f"post_{publication_id}_{item.find('guid').text.split('/')[-1]}" if item.find("guid") is not None else "",
                                "title": item.find("title").text if item.find("title") is not None else "",
                                "subtitle": "",  # RSS doesn't include subtitle
                                "publication": publication_id,  # Changed to match frontend expectation
                                "url": item.find("link").text if item.find("link") is not None else "",
                                "post_date": post_date.isoformat(),
                                "description": clean_description,
                                "cover_image": self.extract_cover_image(description),
                                "excerpt": clean_description[:200] + "..." if len(clean_description) > 200 else clean_description,
                                "type": "substack",
                                "metadata": {
                                    "source": publication_data['url'],
                                    "description": publication_data.get('description', ''),
                                    "publication_name": publication_name  # Moved to metadata
                                }
                            }
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

    async def scrape(self):
        try:
            timeout = aiohttp.ClientTimeout(total=30)  # 30 seconds timeout
            async with aiohttp.ClientSession(timeout=timeout) as session:
                tasks = [self.fetch_publication_posts(session, pub) for pub in self.substack_data]
                results = await asyncio.gather(*tasks, return_exceptions=True)
                
                # Filter out exceptions and flatten the list of posts
                all_posts = []
                for result in results:
                    if isinstance(result, list):
                        all_posts.extend(result)
                    else:
                        logging.error(f"Error in result: {str(result)}")
                
                # Sort by post date
                all_posts.sort(key=lambda x: x.get("post_date", ""), reverse=True)
                
                # Save to JSON file
                with open(self.output_file, 'w', encoding='utf-8') as f:
                    json.dump({
                        "last_updated": datetime.now(timezone.utc).isoformat(),
                        "total_posts": len(all_posts),
                        "posts": all_posts
                    }, f, indent=2, ensure_ascii=False)
                
                logging.info(f"Successfully saved {len(all_posts)} posts to {self.output_file}")
                return all_posts
        except Exception as e:
            logging.error(f"Error in scrape process: {str(e)}")
            return []

async def main():
    scraper = SubstackScraper()
    await scraper.scrape()

if __name__ == "__main__":
    asyncio.run(main())