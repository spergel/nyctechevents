import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import time
import random
from datetime import datetime, timedelta
import pytz
import re
from typing import List, Optional, Dict, Any

from ..scrapers.base_scraper import BaseScraper
from ..models import Event, EventMetadata, EventStatus, EventCategory, Price, Organizer, Venue

class MomaEventScraper(BaseScraper):
    def __init__(self):
        super().__init__("moma")
        self.base_url = "https://www.moma.org"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache"
        }
        
        # Standard metadata for MOMA
        self.default_organizer = Organizer(
            name="The Museum of Modern Art",
            website="https://www.moma.org",
            email="info@moma.org"
        )
        
        # Define MOMA venue
        self.moma_venue = Venue(
            name="The Museum of Modern Art",
            address="11 West 53rd Street, New York, NY 10019",
            type="Museum",
            latitude=40.7614,
            longitude=-73.9776
        )
        
        # Define PS1 venue
        self.ps1_venue = Venue(
            name="MoMA PS1",
            address="22-25 Jackson Avenue, Long Island City, NY 11101",
            type="Museum",
            latitude=40.7447,
            longitude=-73.9487
        )
        
        # Location and community IDs
        self.moma_id = "loc_moma"
        self.ps1_id = "loc_moma_ps1"
        self.community_id = "com_moma"
        
        # Category mapping
        self.category_map = {
            'film': EventCategory.FILM,
            'screening': EventCategory.FILM,
            'performance': EventCategory.PERFORMANCE,
            'music': EventCategory.PERFORMANCE,
            'dance': EventCategory.PERFORMANCE,
            'talk': EventCategory.TALK,
            'conversation': EventCategory.TALK,
            'discussion': EventCategory.TALK,
            'workshop': EventCategory.LEARNING,
            'class': EventCategory.LEARNING,
            'tour': EventCategory.LEARNING,
            'exhibition': EventCategory.ART,
            'gallery': EventCategory.ART,
            'installation': EventCategory.ART
        }

    def _clean_text(self, text: str) -> str:
        """Clean text content."""
        if not text:
            return ""
        # Remove extra whitespace, newlines, and HTML
        text = re.sub(r'<[^>]+>', '', text)
        text = re.sub(r'\s+', ' ', text)
        return text.strip()

    def _parse_datetime(self, date_str: str, time_str: str) -> Optional[datetime]:
        """Convert date and time strings to datetime object."""
        try:
            # Parse date like "Thursday, February 15"
            date_obj = datetime.strptime(date_str, "%A, %B %d")
            
            # Set year to current year or next year if date has passed
            current_year = datetime.now().year
            date_obj = date_obj.replace(year=current_year)
            if date_obj < datetime.now():
                date_obj = date_obj.replace(year=current_year + 1)
            
            # Parse time like "1:30 p.m."
            if time_str:
                # Convert "p.m." to "PM" for parsing
                time_str = time_str.replace("p.m.", "PM").replace("a.m.", "AM")
                try:
                    time_obj = datetime.strptime(time_str, "%I:%M %p")
                except ValueError:
                    # Try alternate format without minutes
                    time_obj = datetime.strptime(time_str, "%I %p")
                
                date_obj = date_obj.replace(
                    hour=time_obj.hour,
                    minute=time_obj.minute
                )
            else:
                # Default to museum opening time if no time specified
                date_obj = date_obj.replace(hour=10, minute=30)
            
            # Convert to UTC
            et = pytz.timezone('America/New_York')
            return et.localize(date_obj).astimezone(pytz.utc)
        except Exception as e:
            self.logger.error(f"Error parsing datetime '{date_str} {time_str}': {str(e)}")
            return None

    def _determine_category(self, event_type: str) -> EventCategory:
        """Map event type to standard category."""
        if not event_type:
            return EventCategory.ART
            
        event_type = event_type.lower()
        for key, category in self.category_map.items():
            if key in event_type:
                return category
        
        return EventCategory.ART

    def _get_event_details(self, url: str) -> Dict[str, Any]:
        """Fetch additional details from event page."""
        details = {}
        
        try:
            if not url:
                return details
                
            response = self.session.get(url, headers=self.headers)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Extract full description
            desc_elem = soup.select_one('div[class*="rich-text"]')
            if desc_elem:
                details['description'] = self._clean_text(desc_elem.get_text())
            
            # Extract price information
            price_elem = soup.select_one('div[class*="price"]')
            if price_elem:
                price_text = self._clean_text(price_elem.get_text())
                if "free" in price_text.lower():
                    details['price'] = Price(
                        amount=0.0,
                        type="Free",
                        details=price_text
                    )
                else:
                    # Try to extract price amount
                    price_match = re.search(r'\$(\d+)', price_text)
                    if price_match:
                        details['price'] = Price(
                            amount=float(price_match.group(1)),
                            type="Paid",
                            details=price_text
                        )
            
            # Extract registration info
            reg_elem = soup.select_one('a[href*="register"]')
            if reg_elem:
                details['registration_required'] = True
                details['registration_url'] = urljoin(self.base_url, reg_elem['href'])
            
            # Extract duration if available
            duration_elem = soup.select_one('span[class*="duration"]')
            if duration_elem:
                duration_text = self._clean_text(duration_elem.get_text())
                if "hour" in duration_text.lower():
                    hours = float(re.search(r'(\d+(?:\.\d+)?)', duration_text).group(1))
                    details['duration'] = timedelta(hours=hours)
                elif "minute" in duration_text.lower():
                    minutes = float(re.search(r'(\d+)', duration_text).group(1))
                    details['duration'] = timedelta(minutes=minutes)
            
            return details
            
        except Exception as e:
            self.logger.error(f"Error fetching event details from {url}: {str(e)}")
            return details

    def _parse_event_card(self, card: BeautifulSoup, event_date: str) -> Optional[Event]:
        """Parse individual event card into standardized Event object."""
        try:
            # Extract basic information
            title = self._extract_text(card, 'span.layout/block.balance-text')
            time_str = self._extract_text(card, 'p:has(> span.layout/block:first-child)')
            location = self._extract_text(card, 'p:has(> span.layout/block):nth-of-type(2)')
            event_type = self._extract_text(card, 'p:has(> span.layout/block):nth-of-type(3)')
            url = self._extract_url(card)
            image_url = self._extract_image(card)
            
            if not title:
                return None
            
            # Determine venue based on location
            location_id = self.moma_id
            venue = self.moma_venue
            if location and "PS1" in location:
                location_id = self.ps1_id
                venue = self.ps1_venue
            
            # Parse datetime
            start_date = self._parse_datetime(event_date, time_str) if event_date and time_str else None
            if not start_date:
                return None
            
            # Get additional details from event page
            details = self._get_event_details(url)
            
            # Set end date based on duration or default to 2 hours
            duration = details.get('duration', timedelta(hours=2))
            end_date = start_date + duration
            
            # Determine category
            category = self._determine_category(event_type)
            
            # Get price information
            price = details.get('price', Price(
                amount=0.0,
                type="Free with Admission",
                details="Free with Museum admission"
            ))
            
            # Create metadata
            metadata = EventMetadata(
                source_url=url,
                source_name=self.source_name,
                organizer=self.default_organizer,
                venue=venue
            )
            
            # Create tags
            tags = ["museum", "art", "culture"]
            if event_type:
                tags.extend(event_type.lower().split())
            if "PS1" in location:
                tags.append("ps1")
            if category == EventCategory.FILM:
                tags.extend(["film", "cinema", "screening"])
            elif category == EventCategory.PERFORMANCE:
                tags.extend(["performance", "live"])
            elif category == EventCategory.TALK:
                tags.extend(["talk", "discussion"])
            
            # Create event object
            event = Event(
                id=self.generate_event_id(title, event_date),
                name=title,
                type=event_type if event_type else "Museum Event",
                location_id=location_id,
                community_id=self.community_id,
                description=details.get('description', f"{event_type} at {location}" if event_type and location else None),
                start_date=start_date,
                end_date=end_date,
                category=category,
                price=price,
                registration_required=details.get('registration_required', False),
                tags=tags,
                status=EventStatus.SCHEDULED,
                image_url=image_url,
                metadata=metadata
            )
            
            return event
            
        except Exception as e:
            self.logger.error(f"Error parsing event card: {str(e)}")
            return None

    def _extract_text(self, card: BeautifulSoup, selector: str) -> str:
        """Extract and clean text from a card element."""
        element = card.select_one(selector)
        return self._clean_text(element.get_text()) if element else ""

    def _extract_url(self, card: BeautifulSoup) -> str:
        """Extract and format URL from a card element."""
        link = card.find('a', href=True)
        return urljoin(self.base_url, link['href']) if link else ""

    def _extract_image(self, card: BeautifulSoup) -> Optional[str]:
        """Extract and format image URL from a card element."""
        img = card.select_one('picture.picture img.picture/image\\:crop')
        if not img or not img.get('src'):
            return None
        return urljoin(self.base_url, img['src'])

    def run(self) -> List[Event]:
        """Run the scraper and return list of events."""
        events = []
        page = 1
        max_pages = 3  # Limit to 3 pages by default
        url = "/calendar/"
        
        try:
            while page <= max_pages:
                self.logger.info(f"Scraping page {page}: {urljoin(self.base_url, url)}")
                
                # Add random delay between requests
                time.sleep(random.uniform(1, 3))
                
                response = self.session.get(
                    urljoin(self.base_url, url),
                    headers=self.headers
                )
                response.raise_for_status()
                
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Extract date headers and events
                date_sections = soup.select('div[class*="layout/flex:column"]')
                
                for section in date_sections:
                    date_header = section.find('h2', class_=lambda c: c and 'typography' in c)
                    current_date = self._clean_text(date_header.get_text()) if date_header else None
                    
                    if not current_date:
                        continue
                    
                    # Find all event cards in this section
                    event_cards = section.find_all('li', class_=lambda c: c and 'layout/flex:row' in c)
                    
                    if not event_cards:
                        self.logger.warning(f"No event cards found for date {current_date}")
                        continue
                    
                    self.logger.info(f"Found {len(event_cards)} events for {current_date}")
                    
                    for card in event_cards:
                        event = self._parse_event_card(card, current_date)
                        if event:
                            events.append(event)
                
                # Handle pagination
                next_button = soup.select_one('a.pagination-item[aria-label="Next"]')
                if not next_button:
                    self.logger.info("No more pages to scrape")
                    break
                
                url = next_button['href']
                page += 1
            
            self.logger.info(f"Successfully scraped {len(events)} events from {page} pages")
            return events
            
        except Exception as e:
            self.logger.error(f"Error running MOMA scraper: {str(e)}")
            return events

def main():
    scraper = MomaEventScraper()
    scraper.run()

if __name__ == "__main__":
    main()