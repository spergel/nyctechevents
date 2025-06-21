# RSS and Calendar Feeds

NYC Events provides RSS and ICS calendar feeds to help you stay updated with the latest tech events in New York City.

## Main Feeds

You can subscribe to the main feeds using these user-friendly URLs:

- **RSS Feed**: [`/rss`](https://nycevents.vercel.app/rss)
- **ICS Calendar**: [`/ics`](https://nycevents.vercel.app/ics)

These feeds will always show all upcoming events.

## Filterable Feeds

You can also create a custom feed for a specific event type by adding a query parameter. This is great for tracking specific interests.

### How to Filter

Add `?type={event-type}` to the feed URL. For example, to get a feed of only "Hackerspace" events:

- **Filtered RSS**: `/api/rss?type=Hackerspace`
- **Filtered ICS**: `/api/ics?type=Hackerspace`

### Available Types
You can use any of the event types found on the main site's filter panel, such as: `Tech`, `Art`, `Hackerspace`, `Conference`, etc. (Note: type names are case-insensitive).

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
- `GET /api/rss` - RSS feed for all events (or filtered by `type`)
- `GET /api/ics` - ICS calendar for all events (or filtered by `type`)
- `GET /api/events/{id}/ics` - ICS calendar for an individual event

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