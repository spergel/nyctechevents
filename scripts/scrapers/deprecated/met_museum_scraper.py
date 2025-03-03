import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime
from typing import List, Dict, Optional
import logging
import re
import time
import uuid
import pytz

from ..scrapers.base_scraper import BaseScraper
from ..models import Event, EventMetadata, EventStatus, EventCategory, Price, Organizer, Venue

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MetMuseumScraper(BaseScraper):
    def __init__(self):
        super().__init__("met_museum")
        self.base_url = "https://www.metmuseum.org"
        
        # Standard metadata for Met Museum
        self.default_organizer = Organizer(
            name="The Metropolitan Museum of Art",
            website="https://www.metmuseum.org",
            email="info@metmuseum.org"
        )
        
        # Define Met Fifth Avenue venue
        self.met_fifth_ave_venue = Venue(
            name="The Met Fifth Avenue",
            address="1000 5th Ave, New York, NY 10028",
            type="Museum",
            latitude=40.7794,
            longitude=-73.9632
        )
        
        # Define Met Cloisters venue
        self.met_cloisters_venue = Venue(
            name="The Met Cloisters",
            address="99 Margaret Corbin Drive, Fort Tryon Park, New York, NY 10040",
            type="Museum",
            latitude=40.8648,
            longitude=-73.9317
        )
        
        # Location and community IDs
        self.met_fifth_ave_id = "loc_met_fifth_ave"
        self.met_cloisters_id = "loc_met_cloisters"
        self.community_id = "com_met"
    
    def _clean_text(self, text: str) -> str:
        """Clean text content."""
        if not text:
            return ""
        # Remove extra whitespace and newlines
        text = re.sub(r'\s+', ' ', text.strip())
        # Clean HTML entities
        text = text.replace("&amp;", "&")
        return text
    
    def _parse_datetime(self, date_str: str, time_str: str) -> Optional[datetime]:
        """Convert date and time strings to datetime object."""
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
            
            # Convert to UTC
            et = pytz.timezone('America/New_York')
            return et.localize(date_obj).astimezone(pytz.utc)
        except Exception as e:
            self.logger.error(f"Error parsing datetime: {str(e)}")
            return None
    
    def _extract_event_info(self, event_card: BeautifulSoup, event_date: Optional[str] = None) -> Optional[Event]:
        """Extract event information from a card element."""
        try:
            # Extract title and URL
            title_elem = event_card.select_one("h4.event-card_title__pXwvu a")
            if not title_elem:
                return None
            
            title = self._clean_text(title_elem.get_text())
            url = title_elem.get('href', '')
            if url and not url.startswith('http'):
                url = f"{self.base_url}{url}"
            
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
            
            # Extract image URL
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
            
            # Determine location and venue
            location_id = self.met_fifth_ave_id
            venue = self.met_fifth_ave_venue
            if "Cloisters" in location:
                location_id = self.met_cloisters_id
                venue = self.met_cloisters_venue
            
            # Parse datetime
            start_date = self._parse_datetime(event_date, event_time) if event_date and event_time else None
            if not start_date:
                return None
            
            # Create price object
            price = Price(
                amount=0.0,  # Actual amount not provided, requires museum admission
                type="Free with Admission" if "Free with Museum admission" in description else "Paid",
                details=admission if admission else "Free with Museum admission"
            )
            
            # Create metadata
            metadata = EventMetadata(
                source_url=url,
                source_name=self.source_name,
                organizer=self.default_organizer,
                venue=venue
            )
            
            # Create event object
            event = Event(
                id=self.generate_event_id(title, event_date),
                name=title,
                type="Museum Event",
                location_id=location_id,
                community_id=self.community_id,
                description=description,
                start_date=start_date,
                end_date=start_date,  # End time not provided
                category=EventCategory.ART,
                price=price,
                registration_required=False,
                tags=["museum", "art", "culture", "exhibition"],
                image_url=image_url,
                metadata=metadata
            )
            
            return event
            
        except Exception as e:
            self.logger.error(f"Error extracting event info: {str(e)}")
            return None
    
    def scrape_events(self) -> List[Event]:
        """Scrape events from the Met Museum website."""
        all_events = []
        page = 1
        max_pages = 5  # Limit to 5 pages by default
        
        try:
            while page <= max_pages:
                url = f"{self.base_url}/events"
                if page > 1:
                    url += f"?page={page}"
                self.logger.info(f"Scraping page {page}: {url}")
                
                response = self.session.get(url)
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
                        self.logger.warning(f"No event cards found for date {event_date}")
                        continue
                    
                    self.logger.info(f"Found {len(event_cards)} events for {event_date}")
                    
                    for card in event_cards:
                        event = self._extract_event_info(card, event_date)
                        if event:
                            all_events.append(event)
                
                # Check for next page button
                next_button = soup.select_one("button.pagination_button__b2y8K[title='Next Week']:not([disabled])")
                if not next_button:
                    self.logger.info("No more pages to scrape (Next Week button not found or disabled)")
                    break
                
                page += 1
            
            self.logger.info(f"Successfully scraped {len(all_events)} events from {page} pages")
            return all_events
            
        except Exception as e:
            self.logger.error(f"Error fetching events: {str(e)}")
            return all_events

    def scrape_tours(self) -> List[Event]:
        """Scrape tours from the Met Museum website."""
        all_tours = []
        page = 1
        max_pages = 5  # Limit to 5 pages by default
        
        try:
            while page <= max_pages:
                url = f"{self.base_url}/tours"
                if page > 1:
                    url += f"?page={page}"
                self.logger.info(f"Scraping page {page}: {url}")
                
                response = self.session.get(url)
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
                        self.logger.warning(f"No tour cards found for date {tour_date}")
                        continue
                    
                    self.logger.info(f"Found {len(tour_cards)} tours for {tour_date}")
                    
                    for card in tour_cards:
                        tour = self._extract_event_info(card, tour_date)
                        if tour:
                            # Update type and tags for tours
                            tour.type = "Museum Tour"
                            tour.tags.extend(["guided-tour", "museum-tour"])
                            all_tours.append(tour)
                
                # Check for next page button
                next_button = soup.select_one("button.pagination_button__b2y8K[title='Next Week']:not([disabled])")
                if not next_button:
                    self.logger.info("No more pages to scrape (Next Week button not found or disabled)")
                    break
                
                page += 1
            
            self.logger.info(f"Successfully scraped {len(all_tours)} tours from {page} pages")
            return all_tours
            
        except Exception as e:
            self.logger.error(f"Error fetching tours: {str(e)}")
            return all_tours

    def run(self):
        """Run the scraper to collect both events and tours."""
        try:
            # Scrape both events and tours
            events = self.scrape_events()
            tours = self.scrape_tours()
            
            # Combine events and tours
            all_events = events + tours
            
            if all_events:
                self.logger.info(f"Successfully scraped {len(all_events)} total events and tours")
                return all_events
            else:
                self.logger.warning("No events or tours were scraped")
                return []
                
        except Exception as e:
            self.logger.error(f"Error running scraper: {str(e)}")
            return []

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
    scraper.run()

if __name__ == "__main__":
    main() 