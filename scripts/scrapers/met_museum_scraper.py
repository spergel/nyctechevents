import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime
from typing import List, Dict, Optional
import logging
import re
import time
import uuid

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MetMuseumScraper:
    def __init__(self):
        self.base_url = "https://www.metmuseum.org"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        }
        self.met_fifth_ave_location = {
            "id": "loc_met_fifth_ave",
            "name": "The Met Fifth Avenue",
            "type": "Museum",
            "address": "1000 5th Ave, New York, NY 10028",
            "coordinates": {
                "lat": 40.7794,
                "lng": -73.9632
            }
        }
        self.met_cloisters_location = {
            "id": "loc_met_cloisters",
            "name": "The Met Cloisters",
            "type": "Museum",
            "address": "99 Margaret Corbin Drive, Fort Tryon Park, New York, NY 10040",
            "coordinates": {
                "lat": 40.8648,
                "lng": -73.9317
            }
        }
        self.met_community = {
            "id": "com_met",
            "name": "The Metropolitan Museum of Art",
            "type": "Museum",
            "description": "The Metropolitan Museum of Art presents over 5,000 years of art from around the world for everyone to experience and enjoy.",
            "website": "https://www.metmuseum.org"
        }

    def _clean_text(self, text: str) -> str:
        """Clean text content."""
        if not text:
            return ""
        # Remove extra whitespace and newlines
        text = re.sub(r'\s+', ' ', text.strip())
        # Clean HTML entities
        text = text.replace("&amp;", "&")
        return text

    def _parse_datetime(self, date_str: str, time_str: str) -> str:
        """Convert date and time strings to ISO format."""
        try:
            # Parse date like "Monday, February 17"
            date_obj = datetime.strptime(date_str, "%A, %B %d")
            # Set year to next occurrence of the date
            current_year = datetime.now().year
            date_obj = date_obj.replace(year=current_year)
            if date_obj < datetime.now():
                date_obj = date_obj.replace(year=current_year + 1)
            
            # Parse time like "11:00 AM"
            if time_str:
                time_obj = datetime.strptime(time_str, "%I:%M %p")
                date_obj = date_obj.replace(
                    hour=time_obj.hour,
                    minute=time_obj.minute
                )
            
            return date_obj.isoformat() + "+00:00"
        except Exception as e:
            logger.error(f"Error parsing datetime: {str(e)}")
            return None

    def _extract_event_info(self, event_card: BeautifulSoup, event_date: Optional[str] = None) -> Optional[Dict]:
        """Extract event information from a card element."""
        try:
            # Extract title and URL
            title_elem = event_card.select_one("h4.event-card_title__pXwvu a")
            if not title_elem:
                return None
            
            title = self._clean_text(title_elem.get_text())
            url = title_elem.get('href', '')
            
            # Extract time, location and admission
            event_time = ""
            location = ""
            admission = ""
            time_place_divs = event_card.select("div.event-card_timeAndPlace__zRyWv")
            
            for div in time_place_divs:
                spans = div.find_all('span')
                text = ' '.join(span.get_text().strip() for span in spans)
                
                if any(keyword in text.lower() for keyword in ['free', 'fee', 'member', 'admission', '$']):
                    admission = self._clean_text(text)
                elif len(spans) >= 2:
                    # This is the time and location div
                    event_time = self._clean_text(spans[0].get_text())
                    location = self._clean_text(spans[1].get_text())

            # Extract description
            description = ""
            desc_elem = event_card.select_one("div.event-card_description__PpU26")
            if desc_elem:
                # Get all text including text within em tags
                description = ' '.join([
                    ' '.join([
                        em.get_text() if em else p.get_text() 
                        for em in p.find_all('em', recursive=True) or [None]
                    ]) 
                    for p in desc_elem.find_all('p')
                    if not (p.find('a') and "visitor guidelines" in p.get_text())
                ])
                description = self._clean_text(description)

            # Extract image URL and alt text
            img_elem = event_card.select_one("img.event-card_cardImage__S3PUh")
            image_url = ""
            if img_elem:
                # Get the highest resolution image from srcSet
                srcset = img_elem.get('srcset', '')
                if srcset:
                    # Split srcset and get the URL with highest width
                    urls = [s.strip().split(' ')[0] for s in srcset.split(',')]
                    if urls:
                        image_url = urls[-1]  # Last one usually has highest resolution
                        # Clean up the URL
                        image_url = image_url.replace('/_next/image?url=', '')
                        image_url = image_url.split('&')[0]  # Remove width and quality parameters

            # Determine location ID and venue info
            location_id = "loc_met_fifth_ave"
            venue = self.met_fifth_ave_location.copy()
            if "Cloisters" in location:
                location_id = "loc_met_cloisters"
                venue = self.met_cloisters_location.copy()

            # Generate event ID
            event_id = f"evt_met_{uuid.uuid4().hex[:8]}"

            # Parse datetime
            start_date = self._parse_datetime(event_date, event_time) if event_date and event_time else None

            return {
                "id": event_id,
                "name": title,
                "type": "Museum Event",
                "locationId": location_id,
                "communityId": "com_met",
                "description": description,
                "startDate": start_date,
                "endDate": None,
                "price": {
                    "amount": 0.0,
                    "currency": "USD",
                    "type": "Free with Admission" if "Free with Museum admission" in description else "Paid",
                    "details": admission if admission else "Free with Museum admission"
                },
                "image": image_url,
                "organizer": {
                    "name": "The Metropolitan Museum of Art",
                    "website": "https://www.metmuseum.org",
                    "email": "info@metmuseum.org"
                },
                "venue": venue,
                "featured": False
            }

        except Exception as e:
            logger.error(f"Error extracting event info: {str(e)}")
            return None

    def scrape_events(self, max_pages: int = 5) -> List[Dict]:
        """Scrape events from the Met Museum website with pagination."""
        all_events = []
        page = 1  # Start with page 1

        try:
            while page <= max_pages:
                url = f"{self.base_url}/events"
                if page > 1:
                    url += f"?page={page}"
                logger.info(f"Scraping page {page}: {url}")
                
                response = requests.get(url, headers=self.headers)
                response.raise_for_status()
                
                # Add a small delay to ensure content is loaded
                time.sleep(2)
                
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Find all date sections
                date_sections = soup.find_all("h3", class_="events-and-tours-app_date__mnAac")
                
                for date_section in date_sections:
                    # Get the date text
                    event_date = self._clean_text(date_section.get_text())
                    
                    # Find all event cards in the following sibling div
                    event_cards_wrapper = date_section.find_next_sibling("div", class_="events-and-tours-app_cardWrapper__yrCAG")
                    if not event_cards_wrapper:
                        continue
                        
                    event_cards = event_cards_wrapper.select("div.event-card_eventCard__4Vt_T")
                    
                    if not event_cards:
                        logger.warning(f"No event cards found for date {event_date}")
                        continue
                    
                    logger.info(f"Found {len(event_cards)} events for {event_date}")
                    
                    for card in event_cards:
                        event_info = self._extract_event_info(card, event_date)
                        if event_info:
                            all_events.append(event_info)
                
                # Check for next page button
                next_button = soup.select_one("button.pagination_button__b2y8K[title='Next Week']:not([disabled])")
                if not next_button:
                    logger.info("No more pages to scrape (Next Week button not found or disabled)")
                    break
                
                page += 1
                
            logger.info(f"Successfully scraped {len(all_events)} events from {page} pages")
            return all_events

        except requests.RequestException as e:
            logger.error(f"Error fetching events: {str(e)}")
            return all_events

    def scrape_tours(self, max_pages: int = 5) -> List[Dict]:
        """Scrape tours from the Met Museum website with pagination."""
        all_tours = []
        page = 1  # Start with page 1

        try:
            while page <= max_pages:
                url = f"{self.base_url}/tours"
                if page > 1:
                    url += f"?page={page}"
                logger.info(f"Scraping page {page}: {url}")
                
                response = requests.get(url, headers=self.headers)
                response.raise_for_status()
                
                # Add a small delay to ensure content is loaded
                time.sleep(2)
                
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Find all date sections
                date_sections = soup.find_all("h3", class_="events-and-tours-app_date__mnAac")
                
                for date_section in date_sections:
                    # Get the date text
                    tour_date = self._clean_text(date_section.get_text())
                    
                    # Find all tour cards in the following sibling div
                    tour_cards_wrapper = date_section.find_next_sibling("div", class_="events-and-tours-app_cardWrapper__yrCAG")
                    if not tour_cards_wrapper:
                        continue
                        
                    tour_cards = tour_cards_wrapper.select("div.event-card_eventCard__4Vt_T")
                    
                    if not tour_cards:
                        logger.warning(f"No tour cards found for date {tour_date}")
                        continue
                    
                    logger.info(f"Found {len(tour_cards)} tours for {tour_date}")
                    
                    for card in tour_cards:
                        tour_info = self._extract_event_info(card, tour_date)
                        if tour_info:
                            # Update type for tours
                            tour_info["type"] = "Museum Tour"
                            all_tours.append(tour_info)
                
                # Check for next page button
                next_button = soup.select_one("button.pagination_button__b2y8K[title='Next Week']:not([disabled])")
                if not next_button:
                    logger.info("No more pages to scrape (Next Week button not found or disabled)")
                    break
                
                page += 1
                
            logger.info(f"Successfully scraped {len(all_tours)} tours from {page} pages")
            return all_tours

        except requests.RequestException as e:
            logger.error(f"Error fetching tours: {str(e)}")
            return all_tours

def save_to_json(data: List[Dict], filename: str):
    """Save scraped data to a JSON file."""
    try:
        # Format as {"events": [...]} to match Yu and Me Books format
        output = {"events": data}
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(output, f, indent=2, ensure_ascii=False)
        logger.info(f"Data saved to {filename}")
    except Exception as e:
        logger.error(f"Error saving data to file: {str(e)}")

def main():
    scraper = MetMuseumScraper()
    
    # Scrape both events and tours
    events = scraper.scrape_events()
    tours = scraper.scrape_tours()
    
    # Combine events and tours
    all_events = events + tours
    
    if all_events:
        logger.info(f"Successfully scraped {len(all_events)} total events and tours")
        save_to_json(all_events, "./data/met_museum_events.json")
    else:
        logger.warning("No events or tours were scraped")

if __name__ == "__main__":
    main() 