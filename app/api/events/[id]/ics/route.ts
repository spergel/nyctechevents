import { NextResponse } from 'next/server';
import events from '@/public/data/events.json';

function escapeText(text: string): string {
  return text
    .replace(/[\\;,]/g, '\\$&')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const event = (events?.events || []).find((e: any) => e.id === eventId);

    if (!event) {
      return new NextResponse('Event not found', { status: 404 });
    }

    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate || event.startDate);
    
    // Format dates for ICS (YYYYMMDDTHHMMSSZ)
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const description = event.description ? escapeText(event.description) : '';
    const location = event.metadata?.venue?.name ? escapeText(event.metadata.venue.name) : '';
    const url = `https://nycevents.vercel.app/events/${event.id}`;

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//NYC Events//Tech & Innovation Events//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${event.id}@nycevents.vercel.app
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${escapeText(event.name)}
DESCRIPTION:${description}
LOCATION:${location}
URL:${url}
CATEGORIES:${event.type}
END:VEVENT
END:VCALENDAR`;

    return new NextResponse(icsContent, {
      headers: {
        'Content-Type': 'text/calendar',
        'Content-Disposition': `attachment; filename="${event.name.replace(/[^a-zA-Z0-9]/g, '-')}.ics"`,
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error generating individual event ICS:', error);
    return new NextResponse('Error generating ICS file', { status: 500 });
  }
} 