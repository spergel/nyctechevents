import { NextResponse } from 'next/server';
import events from '@/public/data/events.json';

function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

export async function GET() {
  try {
    const upcomingEvents = (events?.events || [])
      .filter((event: any) => new Date(event.startDate) > new Date())
      .sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 50); // Limit to 50 most recent events

    const rssContent = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>NYC Events - Tech &amp; Innovation</title>
    <link>https://nycevents.vercel.app</link>
    <description>Latest tech events, meetups, and innovation gatherings in New York City</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="https://nycevents.vercel.app/api/rss" rel="self" type="application/rss+xml" />
    ${upcomingEvents.map((event: any) => `
    <item>
      <guid>${event.id}</guid>
      <title>${escapeXml(event.name)}</title>
      <link>https://nycevents.vercel.app/events/${event.id}</link>
      <description><![CDATA[${event.description || ''}]]></description>
      <pubDate>${new Date(event.startDate).toUTCString()}</pubDate>
      <category>${escapeXml(event.type)}</category>
      ${event.metadata?.venue?.name ? `<location>${escapeXml(event.metadata.venue.name)}</location>` : ''}
    </item>`).join('')}
  </channel>
</rss>`;

    return new NextResponse(rssContent, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error generating RSS feed:', error);
    return new NextResponse('Error generating RSS feed', { status: 500 });
  }
} 