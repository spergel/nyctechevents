from bs4 import BeautifulSoup
import json
import re  # Import regular expression module

def scrape_ra_event(html_file):
    """
    Scrapes event data from a single RA (Resident Advisor) event listing
    from the provided HTML snippet.

    Args:
        html_file: The path to the HTML file containing the event listing.

    Returns:
        A dictionary containing the scraped event data, or None if the
        necessary elements are not found.  Returns an empty dictionary
        if the main event container is not found.
    """

    with open(html_file, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f, 'lxml')

    # Find the main event container.  Use a more specific class if possible.
    event_container = soup.find('div', {'data-pw-test-id': 'event-listing-item-nonticketed'})
    if not event_container:
        return {}  # Return empty dict if main container is missing

    event_data = {}

    # Extract Event Title and Link
    title_link = event_container.find('a', {'data-pw-test-id': 'event-title-link'})
    if title_link:
        event_data['title'] = title_link.get_text(strip=True)
        event_data['link'] = title_link['href']
    else:
        event_data['title'] = None
        event_data['link'] = None

    # Extract Venue and Venue Link
    venue_link = event_container.find('a', {'data-pw-test-id': 'event-venue-link'})
    if venue_link:
        event_data['venue'] = venue_link.get_text(strip=True)
        event_data['venue_link'] = venue_link['href']
    else:
        event_data['venue'] = None
        event_data['venue_link'] = None

    # Extract Bookmark Button Status (Saved or Unsaved)
    bookmark_button = event_container.find('button', {'data-testid': 'saved-events-button'})
    if bookmark_button:
        # Look for the <title> tag within the SVG inside the button
        title_tag = bookmark_button.find('title')
        if title_tag:
            if title_tag.get_text(strip=True) == "Bookmark Unchecked":
                event_data['is_saved'] = False
            elif title_tag.get_text(strip=True) == "Bookmark Checked":
                event_data['is_saved'] = True
            else:
                event_data['is_saved'] = None  # Unknown state
        else:
            event_data['is_saved'] = None  # Could not determine state

    else:
        event_data['is_saved'] = None  # Button not found

    # Extract Image URL (more robust handling)
    image_container = event_container.find('span', {'data-pw-test-id': 'event-image-link'})
    if image_container:
        # Look for a div with a background-image style
        image_div = image_container.find('div', {'class': 'Lazy__Wrapper-sc-11a2pmb-0'})
        if image_div and image_div.has_attr('style'):
            # Use regular expression to extract the URL from the style attribute
            match = re.search(r'url\("(.*?)"\)', image_div['style'])
            if match:
                event_data['image_url'] = match.group(1)
            else:
                event_data['image_url'] = None
        else:
            event_data['image_url'] = None
    else:
        event_data['image_url'] = None

    return event_data

def scrape_ra_events_from_page(html_file):
    """
    Scrapes event data from multiple RA (Resident Advisor) event listings
    from a single HTML page, handling multiple date sections.

    Args:
        html_file: Path to the HTML file.

    Returns:
        A list of dictionaries, each representing a scraped event.
        Returns an empty list if no events are found.
    """
    events = []
    with open(html_file, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f, 'lxml')

    # Find all date sections
    date_sections = soup.find_all('div', class_='Box-sc-abq4qd-0 gfzHpx')

    for date_section in date_sections:
        # Extract Date
        date_container = date_section.find('h3', {'data-testid': 'grouped-header-heading'})
        event_date = date_container.text.strip() if date_container else "Date Not Found"
        event_date = event_date.replace("̸", "").strip()

        # Find event containers *within* the current date section
        event_containers = date_section.find_all('div', {'data-pw-test-id': 'event-listing-item-ticketed'})

        for container in event_containers:
            event = {}
            # --- Existing scraping logic (from previous response) ---
            # Title
            title_element = container.find('a', {'data-pw-test-id': 'event-title-link'})
            event['title'] = title_element.text.strip() if title_element else 'Title Not Found'
            # Extract event link:
            event_link = title_element['href'] if title_element else 'Event Link Not Found'
            event['event_link'] = event_link

            # Artists
            artists_element = container.find('span', {'data-test-id': 'artists-lineup'})
            event['artists'] = artists_element.text.strip() if artists_element else 'Artists Not Found'

            # Venue
            venue_element = container.find('a', {'data-pw-test-id': 'event-venue-link'})
            event['venue'] = venue_element.text.strip() if venue_element else 'Venue Not Found'
            # Extract venue link:
            venue_link = venue_element['href'] if venue_element else 'Venue Link Not Found'
            event['venue_link'] = venue_link

            # Ticket Link
            ticket_link_element = container.find('a', href=re.compile(r'#tickets$'))
            event['ticket_link'] = ticket_link_element['href'] if ticket_link_element else 'Ticket Link Not Found'

            # Interested Count - handles missing count
            interested_element = container.find('div', {'data-test-id': 'interested-count'})
            if interested_element:
                count_span = interested_element.find('span', {'data-testid': 'meta-text'})
                match = re.search(r'(\d+(?:\.\d+[KMB]?)?)', count_span.text.strip()) if count_span else None  # Handles "1.6K"
                event['interested_count'] = match.group(1) if match else '0'
            else:
                event['interested_count'] = '0'

            # Add Date
            event['date'] = event_date
            events.append(event)

    return events

def scrape_ra_event_from_soup(soup):
    """
    Scrapes event data from a single RA event listing, given a BeautifulSoup
    object representing that listing.  This is a helper function for
    scrape_ra_events_from_page.

    Args:
        soup: A BeautifulSoup object representing a single event listing.

    Returns:
        A dictionary containing the scraped event data, or None if the
        necessary elements are not found.
    """
    event_data = {}

    # Find the main event container.  Use a more specific class if possible.
    event_container = soup.find('div', {'data-pw-test-id': 'event-listing-item-nonticketed'})
    if not event_container:
        event_container = soup.find('div', {'data-pw-test-id': 'event-listing-item-ticketed'})
        if not event_container:
            return {}  # Return empty dict if main container is missing

    # Extract Event Title and Link
    title_link = event_container.find('a', {'data-pw-test-id': 'event-title-link'})
    if title_link:
        event_data['title'] = title_link.get_text(strip=True)
        event_data['link'] = title_link['href']
    else:
        event_data['title'] = None
        event_data['link'] = None

    # Extract Venue and Venue Link
    venue_link = event_container.find('a', {'data-pw-test-id': 'event-venue-link'})
    if venue_link:
        event_data['venue'] = venue_link.get_text(strip=True)
        event_data['venue_link'] = venue_link['href']
    else:
        event_data['venue'] = None
        event_data['venue_link'] = None

    # Extract Bookmark Button Status (Saved or Unsaved)
    bookmark_button = event_container.find('button', {'data-testid': 'saved-events-button'})
    if bookmark_button:
        # Look for the <title> tag within the SVG inside the button
        title_tag = bookmark_button.find('title')
        if title_tag:
            if title_tag.get_text(strip=True) == "Bookmark Unchecked":
                event_data['is_saved'] = False
            elif title_tag.get_text(strip=True) == "Bookmark Checked":
                event_data['is_saved'] = True
            else:
                event_data['is_saved'] = None  # Unknown state
        else:
            event_data['is_saved'] = None  # Could not determine state

    else:
        event_data['is_saved'] = None  # Button not found

    # Extract Image URL (more robust handling)
    image_container = event_container.find('span', {'data-pw-test-id': 'event-image-link'})
    if image_container:
        # Look for a div with a background-image style
        image_div = image_container.find('div', {'class': 'Lazy__Wrapper-sc-11a2pmb-0'})
        if image_div and image_div.has_attr('style'):
            # Use regular expression to extract the URL from the style attribute
            match = re.search(r'url\("(.*?)"\)', image_div['style'])
            if match:
                event_data['image_url'] = match.group(1)
            else:
                event_data['image_url'] = None
        else:
            event_data['image_url'] = None
    else:
        event_data['image_url'] = None

    # Extract Lineup
    lineup_element = event_container.find('span', {'data-test-id': 'artists-lineup'})
    if lineup_element:
        event_data['lineup'] = lineup_element.get_text(strip=True)
    else:
        event_data['lineup'] = None
    
    # Extract Date
    date_element = soup.find('li', class_='Column-sc-4kt5ql-0')
    if date_element:
        date_header = date_element.find('h3', class_='Heading__StyledBox-rnlmr6-0')
        if date_header:
            date_text = date_header.get_text(strip=True)
            event_data['date'] = date_text

    # Extract "Interested" count
    interested_count_element = event_container.find('div', {'data-test-id': 'interested-count'})
    if interested_count_element:
        count_text = interested_count_element.find('span', {'data-testid': 'meta-text'})
        if count_text:
            try:
                event_data['interested_count'] = int(count_text.get_text(strip=True))
            except ValueError:
                event_data['interested_count'] = None

    return event_data

def save_events_to_json(events, json_file_path):
    """Saves the scraped events to a JSON file.

    Args:
        events: A list of event dictionaries.
        json_file_path: The path to the output JSON file.
    """
    with open(json_file_path, 'w', encoding='utf-8') as f:
        json.dump(events, f, indent=4)

if __name__ == '__main__':
    html_file = 'ra.html'  # Replace with the actual file name
    # event_data = scrape_ra_event(html_file) # Use this for single event
    event_data = scrape_ra_events_from_page(html_file) # Use this if you have multiple events on the page.

    if event_data:
        print("Scraped Event Data:")
        print(event_data)

        # Save to JSON (optional, but good practice)
        json_output_path = './data/ra_event.json'  # Or your desired path
        save_events_to_json(event_data, json_output_path) # Pass a list, even with one element
        print(f"\nEvent data saved to: {json_output_path}")
    else:
        print("No event data found.")