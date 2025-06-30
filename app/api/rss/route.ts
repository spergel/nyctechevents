import { NextResponse, NextRequest } from 'next/server';
import events from '@/public/data/events.json';
import communities from '@/public/data/communities.json';
import locations from '@/public/data/locations.json';

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

function getCommunity(id: string) {
  return communities?.communities?.find((c: any) => c.id === id);
}

function getLocation(id: string) {
  return locations?.locations?.find((l: any) => l.id === id);
}

function createRichEventDescription(event: any): string {
  const community = getCommunity(event.communityId);
  const location = getLocation(event.locationId);
  
  let description = event.description || '';
  
  // Add rich context for LLMs
  const eventDate = new Date(event.startDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  
  const contextualInfo = [
    `Event Date: ${eventDate}`,
    community ? `Organized by: ${community.name} (${community.type})` : null,
    location ? `Location: ${location.name}, ${location.address}` : null,
    event.price ? `Price: ${event.price.type === 'Free' ? 'Free' : `$${event.price.amount}`}` : null,
    event.type ? `Category: ${event.type}` : null,
  ].filter(Boolean).join(' | ');
  
  return `${description}\n\n${contextualInfo}`;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');

    let upcomingEvents = (events?.events || [])
      .filter((event: any) => new Date(event.startDate) > new Date());

    if (type) {
      upcomingEvents = upcomingEvents.filter((event: any) => 
        event.type && event.type.toLowerCase() === type.toLowerCase()
      );
    }
    
    upcomingEvents = upcomingEvents
      .sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 50); // Limit to 50 most recent events

    const rssContent = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>NYC Events - Tech &amp; Innovation Hub</title>
    <link>https://nycevents.vercel.app</link>
    <description>Discover the latest tech events, meetups, and innovation gatherings in New York City. Your cyberpunk guide to NYC's tech scene.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="https://nycevents.vercel.app/api/rss" rel="self" type="application/rss+xml" />
    <category>Technology</category>
    <category>Events</category>
    <category>New York City</category>
    <category>Innovation</category>
    <category>Startups</category>
    <webMaster>contact@nycevents.vercel.app</webMaster>
    <managingEditor>contact@nycevents.vercel.app</managingEditor>
    <generator>NYC Events Platform</generator>
    <docs>https://www.rssboard.org/rss-specification</docs>
    <ttl>60</ttl>
    ${upcomingEvents.map((event: any) => {
      const community = getCommunity(event.communityId);
      const location = getLocation(event.locationId);
      const richDescription = createRichEventDescription(event);
      
      return `
    <item>
      <guid isPermaLink="true">https://nycevents.vercel.app/events/${event.id}</guid>
      <title>${escapeXml(event.name)}</title>
      <link>https://nycevents.vercel.app/events/${event.id}</link>
      <description><![CDATA[${richDescription}]]></description>
      <content:encoded><![CDATA[
        <h2>${escapeXml(event.name)}</h2>
        <p><strong>Date:</strong> ${new Date(event.startDate).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })}</p>
        ${community ? `<p><strong>Organizer:</strong> ${escapeXml(community.name)} (${escapeXml(community.type)})</p>` : ''}
        ${location ? `<p><strong>Location:</strong> ${escapeXml(location.name)}, ${escapeXml(location.address)}</p>` : ''}
        ${event.price ? `<p><strong>Price:</strong> ${event.price.type === 'Free' ? 'Free' : `$${event.price.amount}`}</p>` : ''}
        <p>${escapeXml(event.description || 'Event details coming soon.')}</p>
        <p><a href="https://nycevents.vercel.app/events/${event.id}">View Event Details</a></p>
      ]]></content:encoded>
      <pubDate>${new Date(event.startDate).toUTCString()}</pubDate>
      <category>${escapeXml(event.type || 'Event')}</category>
      ${community ? `<dc:creator>${escapeXml(community.name)}</dc:creator>` : ''}
      ${location ? `<location>${escapeXml(location.name)}, ${escapeXml(location.address)}</location>` : ''}
      ${event.metadata?.source_url ? `<source url="${escapeXml(event.metadata.source_url)}">Event Registration</source>` : ''}
    </item>`;
    }).join('')}
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