import { NextResponse } from 'next/server';
import events from '@/public/data/events.json';

function escapeText(text: string): string {
  return text
    .replace(/[\\;,]/g, '\\$&')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

export async function GET() {
  try {
    const upcomingEvents = (events?.events || [])
      .filter((event: any) => new Date(event.startDate) > new Date())
      .sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//NYC Events//Tech & Innovation Events//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:NYC Events - Tech & Innovation
X-WR-CALDESC:Latest tech events, meetups, and innovation gatherings in New York City
${upcomingEvents.map((event: any) => {
  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate || event.startDate);
  
  // Format dates for ICS (YYYYMMDDTHHMMSSZ)
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const description = event.description ? escapeText(event.description) : '';
  const location = event.metadata?.venue?.name ? escapeText(event.metadata.venue.name) : '';
  const url = `https://nycevents.vercel.app/events/${event.id}`;

  return `BEGIN:VEVENT
UID:${event.id}@nycevents.vercel.app
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${escapeText(event.name)}
DESCRIPTION:${description}
LOCATION:${location}
URL:${url}
CATEGORIES:${event.type}
END:VEVENT`;
}).join('\n')}
END:VCALENDAR`;

    return new NextResponse(icsContent, {
      headers: {
        'Content-Type': 'text/calendar',
        'Content-Disposition': 'attachment; filename="nyc-events.ics"',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error generating ICS feed:', error);
    return new NextResponse('Error generating ICS feed', { status: 500 });
  }
} 