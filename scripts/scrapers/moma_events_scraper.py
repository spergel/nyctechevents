# import requests
# from bs4 import BeautifulSoup
# from urllib.parse import urljoin
# import time
# import random

# class MomaEventScraper:
#     BASE_URL = "https://www.moma.org"
#     DEFAULT_HEADERS = {
#         "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
#         "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
#         "Accept-Language": "en-US,en;q=0.9",
#         "Referer": "https://www.moma.org/",
#         "DNT": "1",
#         "Connection": "keep-alive",
#         "Sec-Fetch-Dest": "document",
#         "Sec-Fetch-Mode": "navigate",
#         "Sec-Fetch-Site": "same-origin",
#     }

    
#     def __init__(self):
#         self.session = requests.Session()
#         self.session.headers.update(self.DEFAULT_HEADERS)


#     def scrape_events(self, url="/calendar/", max_pages=3):
#         """Scrape events with headers and request throttling"""
#         events = []
#         page = 1
        
#         while page <= max_pages:
#             try:
#                 # Add random delay between requests
#                 time.sleep(random.uniform(1, 3))
                
#                 response = self.session.get(
#                     urljoin(self.BASE_URL, url),
#                     headers={
#                         "Cache-Control": "no-cache",
#                         "Pragma": "no-cache"
#                     }
#                 )
#                 response.raise_for_status()
#                 soup = BeautifulSoup(response.text, 'html.parser')
                
#                 # Extract date headers and events
#                 date_sections = soup.select('div[class*="layout/flex:column"]')
                
#                 for section in date_sections:
#                     date_header = section.find('h2', class_=lambda c: c and 'typography' in c)
#                     current_date = self._clean_text(date_header.get_text()) if date_header else "Date not available"
                    
#                     # Find all event cards in this section
#                     event_cards = section.find_all('li', class_=lambda c: c and 'layout/flex:row' in c)
                    
#                     for card in event_cards:
#                         event = self._parse_event_card(card)
#                         event['date'] = current_date
#                         events.append(event)
                
#                 # Handle pagination
#                 next_button = soup.select_one('a.pagination-item[aria-label="Next"]')
#                 if not next_button:
#                     break
                    
#                 url = next_button['href']
#                 page += 1
                
#             except Exception as e:
#                 print(f"Error scraping page {page}: {str(e)}")
#                 break
                
#         return events

#     def _parse_event_card(self, card):
#         """Parse individual event card"""
#         return {
#             'title': self._extract_text(card, 'span.layout/block.balance-text'),
#             'time': self._extract_text(card, 'p:has(> span.layout/block:first-child)'),
#             'location': self._extract_text(card, 'p:has(> span.layout/block):nth-of-type(2)'),
#             'event_type': self._extract_text(card, 'p:has(> span.layout/block):nth-of-type(3)'),
#             'url': self._extract_url(card),
#             'image': self._extract_image(card),
#         }

#     def _extract_text(self, card, selector):
#         element = card.select_one(selector)
#         return self._clean_text(element.get_text()) if element else None

#     def _extract_url(self, card):
#         link = card.find('a', href=True)
#         return urljoin(self.BASE_URL, link['href']) if link else None

#     def _extract_image(self, card):
#         img = card.select_one('picture.picture img.picture/image\\:crop')
#         return urljoin(self.BASE_URL, img['src']) if img else None

#     def _clean_text(self, text):
#         return ' '.join(text.strip().split()) if text else None

# # Usage
# scraper = MomaEventScraper()
# events = scraper.scrape_events()
# print(f"Scraped {len(events)} events")