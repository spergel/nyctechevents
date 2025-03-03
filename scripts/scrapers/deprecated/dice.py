from bs4 import BeautifulSoup
import re  # Import the regular expression module
import json  # Import the json module

def scrape_dice_events(html_file):
    """
    Scrapes event data from the provided DICE HTML file.

    Args:
        html_file: The path to the DICE HTML file.

    Returns:
        A list of dictionaries, where each dictionary represents an event
        and contains the following keys:
        - title: The title of the event.
        - date: The date of the event.
        - venue: The venue of the event.
        - price: The price of the event.
        - link: The URL of the event page.
        - image: The URL of the event image.
        - audio_preview: The URL of the audio preview (if available), otherwise None.
        - has_interest_button:  A boolean, True if present, False if not, None if can't determine.
    """

    with open(html_file, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f, 'lxml')

    events = []
    event_cards = soup.find_all('div', class_='EventCard__Event-sc-5ea8797e-1')

    for card in event_cards:
        event_data = {}

        # Extract Link
        link_tag = card.find('a', class_='styles__EventCardLink-sc-4cc6fa9-5')
        event_data['link'] = link_tag['href'] if link_tag else None

        # Extract Image
        image_tag = card.find('img', class_='styles__Image-sc-4cc6fa9-3')
        event_data['image'] = image_tag['src'] if image_tag else None
        # Use srcset for higher quality if needed:  image_tag['srcset'] if image_tag else None

        # Extract Title
        title_tag = card.find('div', class_='styles__Title-sc-4cc6fa9-6')
        event_data['title'] = title_tag.get_text(strip=True) if title_tag else None

        # Extract Date
        date_tag = card.find('div', class_='styles__DateText-sc-4cc6fa9-8')
        event_data['date'] = date_tag.get_text(strip=True) if date_tag else None

        # Extract Venue
        venue_tag = card.find('div', class_='styles__Venue-sc-4cc6fa9-7')
        event_data['venue'] = venue_tag.get_text(strip=True) if venue_tag else None

        # Extract Price
        price_tag = card.find('div', class_='styles__Price-sc-4cc6fa9-9')
        event_data['price'] = price_tag.get_text(strip=True) if price_tag else None

        # Extract Audio Preview
        audio_source_tag = card.find('source')
        event_data['audio_preview'] = audio_source_tag['src'] if audio_source_tag else None

        # Check for Interest Button (presence/absence)
        interest_button = card.find('button', class_='EventAddToInterests__Container-sc-eaf23920-0')
        #  event_data['has_interest_button'] = interest_button is not None  # Simplest approach
        if interest_button:
            # More robust: Check if the button is disabled
            event_data['has_interest_button'] = not interest_button.has_attr('disabled')
        else:
            event_data['has_interest_button'] = None


        events.append(event_data)

    return events



def scrape_dice_metadata(html_file):
    """Scrapes metadata from the DICE HTML file.

    Args:
        html_file: Path to the HTML file.

    Returns:
        A dictionary containing the extracted metadata.  Returns an empty
        dictionary if no metadata is found.
    """
    with open(html_file, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f, 'lxml')

    metadata = {}

    # Find the script tag with type "application/ld+json"
    script_tag = soup.find('script', type='application/ld+json')

    if script_tag:
        try:
            metadata = json.loads(script_tag.string)
        except json.JSONDecodeError:
            print("Error: Could not decode JSON metadata.")
            return {}  # Return empty dict on error.
    else:
        print("No metadata script tag found.") # Explicitly state this.

    return metadata


def extract_dice_logo_svg(html_file):
    """Extracts and cleans the DICE logo SVG data.

    Args:
        html_file: Path to the HTML file.

    Returns:
        A string containing the cleaned SVG data, or None if not found.
    """
    with open(html_file, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f, 'lxml')

    logo_container = soup.find('div', class_='Logo__MobileContainer-sc-4f224620-2')
    if not logo_container:
        return None

    svg_tags = logo_container.find_all('svg')
    if not svg_tags:
        return None

    svg_data = []
    for svg_tag in svg_tags:
        # Remove width, height, and class attributes
        for attr in ['width', 'height', 'class']:
            if attr in svg_tag.attrs:
                del svg_tag.attrs[attr]

        # Remove unnecessary whitespace and newlines
        svg_string = str(svg_tag)
        svg_string = re.sub(r'\s+', ' ', svg_string).strip()  # Replace multiple spaces with single
        svg_string = re.sub(r'>\s+<', '><', svg_string)  # Remove space between tags
        svg_data.append(svg_string)

    return "\n".join(svg_data)


def extract_footer_links(html_file):
    """
    Extracts footer links from the DICE HTML file.

    Args:
        html_file: The path to the DICE HTML file.

    Returns:
        A dictionary where keys are section titles (e.g., "DICE") and values
        are lists of dictionaries, each with "text" and "href" keys for a link.
    """
    with open(html_file, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f, 'lxml')

    footer_links = {}
    footer_nav = soup.find('div', class_='HomePageFooter__Nav-sc-8a5d6b95-8')

    if footer_nav:
        for details in footer_nav.find_all('details', class_='HomePageFooterNavCol-sc-3822cd4f-0'):
            section_title = details.find('summary', class_='HomePageFooterNavCol__NavTitle-sc-3822cd4f-2').get_text(strip=True)
            links = []
            for item in details.find_all('div', class_='HomePageFooterNavCol__NavItem-sc-3822cd4f-4'):
                a_tag = item.find('a', class_='HomePageFooterNavCol__FooterLink-sc-3822cd4f-5')
                if a_tag:
                    links.append({
                        'text': a_tag.get_text(strip=True),
                        'href': a_tag['href']
                    })
            footer_links[section_title] = links
    return footer_links


def save_events_to_json(events, json_file_path):
    """Saves the scraped events to a JSON file.

    Args:
        events: A list of event dictionaries.
        json_file_path: The path to the output JSON file.
    """
    with open(json_file_path, 'w', encoding='utf-8') as f:
        json.dump(events, f, indent=4)  # Use indent for pretty printing


if __name__ == '__main__':
    html_file = 'dice.html'  # Replace with your file path
    events = scrape_dice_events(html_file)
    print("Scraped Events:")
    for event in events:
        print(event)

    # Save events to JSON
    json_output_path = './data/dice.json'
    save_events_to_json(events, json_output_path)
    print(f"\nEvents saved to: {json_output_path}")

    metadata = scrape_dice_metadata(html_file)
    print("\nScraped Metadata:")
    print(metadata)

    logo_svg = extract_dice_logo_svg(html_file)
    print("\nExtracted Logo SVG:")
    print(logo_svg)

    footer_links = extract_footer_links(html_file)
    print("\nExtracted Footer Links:")
    print(footer_links)