import requests
from bs4 import BeautifulSoup
import re
import json
from urllib.parse import urljoin, urlparse
import logging
from typing import Dict, List, Optional
import jsbeautifier
from dataclasses import dataclass
from playwright.sync_api import sync_playwright
import urllib.parse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.FileHandler('sniffer.log'), logging.StreamHandler()]
)

@dataclass
class ScrapingPattern:
    """Represents a detected scraping pattern"""
    type: str  # api, xml, html, json, gcal
    method: str  # GET, POST
    url: str
    headers: Optional[Dict] = None
    params: Optional[Dict] = None
    data: Optional[Dict] = None
    selectors: Optional[Dict] = None
    pagination: Optional[Dict] = None
    confidence: float = 0.0
    notes: List[str] = None
    calendar_id: Optional[str] = None  # For Google Calendar IDs

class ScraperSniffer:
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        
    def _get_page_content(self, url: str) -> tuple:
        """Get both static and dynamic page content"""
        # First try static request
        try:
            response = requests.get(url, headers=self.headers)
            static_content = response.text
            
            # Get dynamic content using playwright
            with sync_playwright() as p:
                browser = p.chromium.launch()
                page = browser.new_page()
                page.goto(url)
                # Wait for dynamic content
                page.wait_for_timeout(5000)
                dynamic_content = page.content()
                
                # Capture network requests
                network_requests = []
                page.on("request", lambda req: network_requests.append({
                    'url': req.url,
                    'method': req.method,
                    'headers': req.headers,
                    'data': req.post_data
                }))
                
                browser.close()
                
            return static_content, dynamic_content, network_requests
            
        except Exception as e:
            logging.error(f"Error fetching page: {str(e)}")
            return None, None, []

    def _find_api_patterns(self, content: str, network_requests: List[Dict]) -> List[ScrapingPattern]:
        """Look for API endpoints in page source and network requests"""
        patterns = []
        
        # Look for fetch/axios calls
        api_calls = re.findall(r'(?:fetch|axios)\(([\'"](.*?)[\'"]\s*,?\s*{(.+?)})', content)
        for call in api_calls:
            if any(term in call[1].lower() for term in ['event', 'calendar', 'schedule']):
                try:
                    config = json.loads(f"{{{call[2]}}}")
                    patterns.append(ScrapingPattern(
                        type='api',
                        method=config.get('method', 'GET'),
                        url=call[1],
                        headers=config.get('headers'),
                        params=config.get('params'),
                        data=config.get('data'),
                        confidence=0.8,
                        notes=['Found in fetch/axios call']
                    ))
                except:
                    pass

        # Look for API endpoints in network requests
        for req in network_requests:
            if any(term in req['url'].lower() for term in ['event', 'calendar', 'schedule', 'api']):
                patterns.append(ScrapingPattern(
                    type='api',
                    method=req['method'],
                    url=req['url'],
                    headers=req['headers'],
                    data=req['data'],
                    confidence=0.9,
                    notes=['Found in network requests']
                ))

        return patterns

    def _find_xml_feeds(self, content: str, url: str) -> List[ScrapingPattern]:
        """Look for XML/RSS/iCal feeds"""
        patterns = []
        soup = BeautifulSoup(content, 'html.parser')
        
        # Look for feed links
        feed_links = soup.find_all('link', {
            'type': re.compile(r'application/(rss|atom|xml|calendar)\+xml|text/calendar')
        })
        
        for link in feed_links:
            href = urljoin(url, link.get('href', ''))
            if href:
                patterns.append(ScrapingPattern(
                    type='xml',
                    method='GET',
                    url=href,
                    confidence=0.9,
                    notes=[f'Found {link.get("type")} feed']
                ))

        # Look for .ics files
        ics_links = re.findall(r'href=[\'"]([^\'"]+\.ics)[\'"]', content)
        for link in ics_links:
            patterns.append(ScrapingPattern(
                type='ical',
                method='GET',
                url=urljoin(url, link),
                confidence=0.9,
                notes=['Found .ics calendar file']
            ))

        return patterns

    def _find_html_patterns(self, content: str) -> List[ScrapingPattern]:
        """Look for HTML scraping patterns"""
        patterns = []
        soup = BeautifulSoup(content, 'html.parser')
        
        # Common event container patterns
        event_selectors = {
            'div.event': 0.7,
            'div.calendar-event': 0.8,
            'article.event': 0.8,
            'div.eventlist-event': 0.9,
            'div[itemtype*="Event"]': 0.9,
            '.event-card': 0.8,
            '.event-listing': 0.8,
            '.event-item': 0.8
        }
        
        # Check each selector
        for selector, confidence in event_selectors.items():
            elements = soup.select(selector)
            if elements:
                # Analyze first element for common event properties
                first_elem = elements[0]
                selectors = {}
                
                # Look for common event properties
                for prop in ['title', 'name', 'date', 'time', 'location', 'description']:
                    prop_elem = first_elem.find(class_=re.compile(f'.*{prop}.*'))
                    if prop_elem:
                        selectors[prop] = f"{selector} .{prop_elem['class'][0]}"
                
                # Look for pagination
                pagination = {}
                paging_elements = soup.select('.pagination, .pager, nav[aria-label*="pagination"]')
                if paging_elements:
                    pagination['selector'] = paging_elements[0].name + '.' + ' .'.join(paging_elements[0].get('class', []))
                    next_link = paging_elements[0].find('a', string=re.compile(r'next|›|»', re.I))
                    if next_link:
                        pagination['next_pattern'] = next_link.get('href')
                
                patterns.append(ScrapingPattern(
                    type='html',
                    method='GET',
                    url='',  # URL pattern will need to be determined
                    selectors=selectors,
                    pagination=pagination,
                    confidence=confidence * (len(selectors) / 6),  # Adjust confidence based on found properties
                    notes=[f'Found {len(elements)} event elements']
                ))
        
        return patterns

    def _find_json_data(self, content: str) -> List[ScrapingPattern]:
        """Look for embedded JSON data"""
        patterns = []
        
        # Look for JSON-LD
        json_ld = re.findall(r'<script type="application/ld\+json">(.*?)</script>', content, re.DOTALL)
        for json_data in json_ld:
            try:
                data = json.loads(json_data)
                if '@type' in data and 'Event' in str(data['@type']):
                    patterns.append(ScrapingPattern(
                        type='json_ld',
                        method='GET',
                        url='',
                        data=data,
                        confidence=0.9,
                        notes=['Found JSON-LD event data']
                    ))
            except:
                pass
        
        # Look for embedded JSON data
        json_vars = re.findall(r'var\s+(\w+)\s*=\s*({.*?});', content, re.DOTALL)
        for var_name, json_str in json_vars:
            if any(term in var_name.lower() for term in ['event', 'calendar']):
                try:
                    data = json.loads(json_str)
                    patterns.append(ScrapingPattern(
                        type='embedded_json',
                        method='GET',
                        url='',
                        data=data,
                        confidence=0.7,
                        notes=[f'Found embedded JSON in variable {var_name}']
                    ))
                except:
                    pass
        
        return patterns

    def _find_graphql_patterns(self, content: str, network_requests: List[Dict]) -> List[ScrapingPattern]:
        """Look for GraphQL endpoints and queries"""
        patterns = []
        
        # Look for GraphQL endpoints in network requests
        for req in network_requests:
            if '/graphql' in req['url'].lower() or 'query' in str(req.get('data', '')):
                try:
                    # Try to parse and beautify the query
                    if req.get('data'):
                        data = json.loads(req['data'])
                        if 'query' in data:
                            patterns.append(ScrapingPattern(
                                type='graphql',
                                method='POST',
                                url=req['url'],
                                headers=req['headers'],
                                data=data,
                                confidence=0.9,
                                notes=['Found GraphQL query in network request']
                            ))
                except:
                    pass
        
        # Look for GraphQL queries in page source
        graphql_patterns = re.findall(r'query\s*{\s*events?\s*{([^}]+)}', content)
        if graphql_patterns:
            patterns.append(ScrapingPattern(
                type='graphql',
                method='POST',
                url='/graphql',  # Generic endpoint
                data={'query': graphql_patterns[0]},
                confidence=0.7,
                notes=['Found GraphQL query in page source']
            ))
        
        return patterns

    def _find_google_calendars(self, content: str, network_requests: List[Dict]) -> List[ScrapingPattern]:
        """Look for Google Calendar embeds and public URLs"""
        patterns = []
        
        # Look for embedded Google Calendar iframes
        iframe_patterns = [
            # Standard calendar embed
            r'https://calendar\.google\.com/calendar/embed\?([^"\']+)',
            # Embedded agenda view
            r'https://calendar\.google\.com/calendar/htmlembed\?([^"\']+)',
            # Public calendar URL
            r'https://calendar\.google\.com/calendar/u/0/embed\?([^"\']+)',
            # Calendar API endpoint
            r'https://www\.googleapis\.com/calendar/v3/calendars/([^/]+)/events'
        ]
        
        for pattern in iframe_patterns:
            matches = re.findall(pattern, content)
            for match in matches:
                try:
                    # Parse calendar parameters
                    params = dict(urllib.parse.parse_qsl(match))
                    calendar_id = params.get('src', '')
                    
                    # Clean up calendar ID
                    if '%40' in calendar_id:
                        calendar_id = urllib.parse.unquote(calendar_id)
                    
                    patterns.append(ScrapingPattern(
                        type='gcal',
                        method='GET',
                        url=f"https://calendar.google.com/calendar/embed?src={calendar_id}",
                        params=params,
                        calendar_id=calendar_id,
                        confidence=0.95,
                        notes=['Found Google Calendar embed']
                    ))
                except:
                    pass

        # Look for Google Calendar API calls in network requests
        for req in network_requests:
            if 'googleapis.com/calendar' in req['url']:
                try:
                    # Extract calendar ID from API URL
                    cal_id_match = re.search(r'/calendars/([^/]+)/events', req['url'])
                    if cal_id_match:
                        calendar_id = cal_id_match.group(1)
                        patterns.append(ScrapingPattern(
                            type='gcal_api',
                            method='GET',
                            url=req['url'],
                            headers=req['headers'],
                            calendar_id=urllib.parse.unquote(calendar_id),
                            confidence=0.9,
                            notes=['Found Google Calendar API request']
                        ))
                except:
                    pass

        # Look for public Google Calendar links
        public_cal_links = re.findall(r'href=["\'](https://calendar\.google\.com/calendar/[^"\']+)["\']', content)
        for link in public_cal_links:
            try:
                # Parse calendar URL
                parsed = urllib.parse.urlparse(link)
                params = dict(urllib.parse.parse_qsl(parsed.query))
                
                if 'cid' in params:
                    patterns.append(ScrapingPattern(
                        type='gcal_public',
                        method='GET',
                        url=link,
                        params=params,
                        calendar_id=params['cid'],
                        confidence=0.85,
                        notes=['Found public Google Calendar link']
                    ))
            except:
                pass

        # Look for calendar data in JavaScript
        js_patterns = [
            r'gapi\.client\.calendar\.events\.list\({([^}]+)}\)',
            r'calendar\.google\.com/feeds/[^/]+/([^/]+)/public/full'
        ]
        
        for pattern in js_patterns:
            matches = re.findall(pattern, content)
            for match in matches:
                try:
                    if 'calendarId' in match:
                        # Extract from GAPI call
                        cal_id = re.search(r'calendarId:\s*[\'"]([^\'"]+)[\'"]', match)
                        if cal_id:
                            patterns.append(ScrapingPattern(
                                type='gcal_api',
                                method='GET',
                                url=f"https://www.googleapis.com/calendar/v3/calendars/{cal_id.group(1)}/events",
                                calendar_id=cal_id.group(1),
                                confidence=0.8,
                                notes=['Found Google Calendar API call in JavaScript']
                            ))
                    else:
                        # Extract from feed URL
                        patterns.append(ScrapingPattern(
                            type='gcal_feed',
                            method='GET',
                            url=f"https://calendar.google.com/feeds/{match}/public/full",
                            calendar_id=match,
                            confidence=0.8,
                            notes=['Found Google Calendar feed URL']
                        ))
                except:
                    pass

        return patterns

    def sniff(self, url: str) -> List[ScrapingPattern]:
        """Analyze a webpage for scraping patterns"""
        static_content, dynamic_content, network_requests = self._get_page_content(url)
        if not static_content:
            return []
            
        patterns = []
        
        # Check each pattern type
        patterns.extend(self._find_api_patterns(dynamic_content or static_content, network_requests))
        patterns.extend(self._find_xml_feeds(static_content, url))
        patterns.extend(self._find_html_patterns(dynamic_content or static_content))
        patterns.extend(self._find_json_data(dynamic_content or static_content))
        patterns.extend(self._find_graphql_patterns(dynamic_content or static_content, network_requests))
        patterns.extend(self._find_google_calendars(dynamic_content or static_content, network_requests))
        
        # Sort by confidence
        patterns.sort(key=lambda x: x.confidence, reverse=True)
        
        return patterns

def main():
    sniffer = ScraperSniffer()
    
    # Example URLs to analyze
    urls = [
        "https://www.eventbrite.com/d/ny--new-york/events/",
        "https://www.meetup.com/find/?location=us--ny--new%20york",
        "https://www.nycgovparks.org/events",
        
        # Add Google Calendar examples
    ]
    
    for url in urls:
        logging.info(f"\nAnalyzing {url}")
        patterns = sniffer.sniff(url)
        
        for i, pattern in enumerate(patterns, 1):
            logging.info(f"\nPattern {i} (Confidence: {pattern.confidence:.2f})")
            logging.info(f"Type: {pattern.type}")
            logging.info(f"Method: {pattern.method}")
            logging.info(f"URL: {pattern.url}")
            
            if pattern.calendar_id:
                logging.info(f"Calendar ID: {pattern.calendar_id}")
            
            if pattern.headers:
                logging.info("Headers:")
                logging.info(json.dumps(pattern.headers, indent=2))
                
            if pattern.selectors:
                logging.info("Selectors:")
                logging.info(json.dumps(pattern.selectors, indent=2))
                
            if pattern.pagination:
                logging.info("Pagination:")
                logging.info(json.dumps(pattern.pagination, indent=2))
                
            if pattern.notes:
                logging.info("Notes:")
                logging.info("\n".join(pattern.notes))

if __name__ == '__main__':
    main() 