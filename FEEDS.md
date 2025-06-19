# RSS and Calendar Feeds

NYC Events provides RSS and ICS calendar feeds to help you stay updated with the latest tech events in New York City.

## RSS Feed

Subscribe to our RSS feed to get updates about new events in your favorite RSS reader.

**Feed URL:** `https://nycevents.vercel.app/api/rss`

**Features:**
- Latest 50 upcoming events
- Event details including description, location, and category
- Automatic updates when new events are added
- Compatible with all major RSS readers

**Example RSS Readers:**
- Feedly
- Inoreader
- NetNewsWire (Mac/iOS)
- Reeder (Mac/iOS)
- NewsBlur

## ICS Calendar Feed

Download our ICS calendar file to add all upcoming events to your calendar application.

**Feed URL:** `https://nycevents.vercel.app/api/ics`

**Features:**
- All upcoming events in iCalendar format
- Event details including start/end times, location, and description
- Compatible with Google Calendar, Apple Calendar, Outlook, and more
- Automatic updates when new events are added

**How to use:**
1. Click the "ICS" button on the homepage
2. Your browser will download a `.ics` file
3. Open the file with your calendar application
4. Choose to add all events to your calendar

## Individual Event Calendar

Add individual events to your calendar directly from the event detail page.

**URL Format:** `https://nycevents.vercel.app/api/events/{event-id}/ics`

**Features:**
- Single event in iCalendar format
- Perfect for adding specific events to your calendar
- Includes all event details and location information

## Browser Integration

Modern browsers and RSS readers can automatically detect our feeds:

- **RSS:** Add `https://nycevents.vercel.app/api/rss` to your RSS reader
- **Calendar:** Subscribe to `https://nycevents.vercel.app/api/ics` in your calendar app

## Technical Details

### RSS Feed Format
- RSS 2.0 with Atom namespace
- UTF-8 encoding
- Cached for 1 hour
- Includes event metadata and location information

### ICS Calendar Format
- iCalendar 2.0 specification
- UTC timezone
- Includes event descriptions and locations
- Properly escaped text content

### API Endpoints
- `GET /api/rss` - RSS feed for all events
- `GET /api/ics` - ICS calendar for all events  
- `GET /api/events/{id}/ics` - ICS calendar for individual event

## Troubleshooting

**RSS feed not updating:**
- Clear your RSS reader's cache
- Check that the feed URL is correct
- Wait up to 1 hour for cache refresh

**Calendar events not showing:**
- Ensure your calendar app supports ICS files
- Check that the file downloaded correctly
- Try importing the file manually into your calendar

**Individual event not found:**
- Verify the event ID is correct
- Check that the event hasn't been removed
- Contact support if the issue persists

## Support

If you have issues with the feeds, please:
1. Check this documentation first
2. Try the troubleshooting steps above
3. Open an issue on GitHub with details about your problem 