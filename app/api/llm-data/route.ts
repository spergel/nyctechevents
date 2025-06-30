import { NextResponse, NextRequest } from 'next/server';
import events from '@/public/data/events.json';
import communities from '@/public/data/communities.json';
import locations from '@/public/data/locations.json';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'json';
    const include = searchParams.get('include') || 'events,communities,locations';
    const limit = parseInt(searchParams.get('limit') || '50');

    const includeTypes = include.split(',');
    
    // Filter and enrich events
    let upcomingEvents = (events?.events || [])
      .filter((event: any) => new Date(event.startDate) > new Date())
      .sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, limit);

    // Enrich events with community and location data
    const enrichedEvents = upcomingEvents.map((event: any) => {
      const community = communities?.communities?.find((c: any) => c.id === event.communityId);
      const location = locations?.locations?.find((l: any) => l.id === event.locationId);
      
      return {
        ...event,
        enrichedData: {
          community: community ? {
            name: community.name,
            type: community.type,
            description: community.description,
            website: community.website,
            social: community.contact?.social
          } : null,
          location: location ? {
            name: location.name,
            address: location.address,
            type: location.type,
            description: location.description,
            coordinates: location.coordinates
          } : null,
          eventDate: new Date(event.startDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            timeZoneName: 'short'
          }),
          contextualDescription: createContextualDescription(event, community, location)
        }
      };
    });

    const responseData: any = {
      metadata: {
        title: "NYC Events & Communities - Tech Innovation Hub",
        description: "Comprehensive data about New York City's tech events, communities, and innovation spaces",
        lastUpdated: new Date().toISOString(),
        website: "https://nycevents.vercel.app",
        contact: "Your cyberpunk guide to NYC's tech scene",
        totalEvents: enrichedEvents.length,
        totalCommunities: communities?.communities?.length || 0,
        totalLocations: locations?.locations?.length || 0,
        dataStructure: {
          events: "Tech events, meetups, and innovation gatherings",
          communities: "Organizations, startups, and tech groups",
          locations: "Venues, coworking spaces, and event locations"
        }
      }
    };

    if (includeTypes.includes('events')) {
      responseData.events = enrichedEvents;
    }

    if (includeTypes.includes('communities')) {
      responseData.communities = (communities?.communities || []).map((community: any) => ({
        ...community,
        enrichedData: {
          upcomingEvents: enrichedEvents.filter(e => e.communityId === community.id).length,
          contextualDescription: `${community.name} is a ${community.type} community in NYC. ${community.description || ''} ${community.founded ? `Founded in ${community.founded}.` : ''} ${community.website ? `Website: ${community.website}` : ''}`
        }
      }));
    }

    if (includeTypes.includes('locations')) {
      responseData.locations = (locations?.locations || []).map((location: any) => ({
        ...location,
        enrichedData: {
          upcomingEvents: enrichedEvents.filter(e => e.locationId === location.id).length,
          contextualDescription: `${location.name} is a ${location.type} located at ${location.address} in NYC. ${location.description || ''}`
        }
      }));
    }

    if (format === 'markdown') {
      const markdownContent = generateMarkdownContent(responseData);
      return new NextResponse(markdownContent, {
        headers: {
          'Content-Type': 'text/markdown',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'public, max-age=3600',
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('Error generating LLM data:', error);
    return new NextResponse('Error generating LLM data', { status: 500 });
  }
}

function createContextualDescription(event: any, community: any, location: any): string {
  const parts = [
    event.description || `${event.name} is a ${event.type || 'tech'} event in NYC.`,
    community ? `Organized by ${community.name}, a ${community.type} community.` : '',
    location ? `Taking place at ${location.name}, ${location.address}.` : '',
    event.price ? `${event.price.type === 'Free' ? 'Free to attend.' : `Costs $${event.price.amount}.`}` : '',
    `Scheduled for ${new Date(event.startDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })}.`
  ];
  
  return parts.filter(Boolean).join(' ');
}

function generateMarkdownContent(data: any): string {
  let markdown = `# NYC Events & Communities - Tech Innovation Hub\n\n`;
  markdown += `${data.metadata.description}\n\n`;
  markdown += `**Last Updated:** ${new Date(data.metadata.lastUpdated).toLocaleDateString()}\n`;
  markdown += `**Website:** ${data.metadata.website}\n\n`;

  if (data.events) {
    markdown += `## Upcoming Tech Events (${data.events.length})\n\n`;
    data.events.forEach((event: any) => {
      markdown += `### ${event.name}\n`;
      markdown += `- **Date:** ${event.enrichedData.eventDate}\n`;
      markdown += `- **Type:** ${event.type}\n`;
      if (event.enrichedData.community) {
        markdown += `- **Organizer:** ${event.enrichedData.community.name} (${event.enrichedData.community.type})\n`;
      }
      if (event.enrichedData.location) {
        markdown += `- **Location:** ${event.enrichedData.location.name}, ${event.enrichedData.location.address}\n`;
      }
      if (event.price) {
        markdown += `- **Price:** ${event.price.type === 'Free' ? 'Free' : `$${event.price.amount}`}\n`;
      }
      markdown += `- **Description:** ${event.enrichedData.contextualDescription}\n`;
      if (event.metadata?.source_url) {
        markdown += `- **Registration:** ${event.metadata.source_url}\n`;
      }
      markdown += `\n`;
    });
  }

  if (data.communities) {
    markdown += `## Tech Communities (${data.communities.length})\n\n`;
    data.communities.forEach((community: any) => {
      markdown += `### ${community.name}\n`;
      markdown += `- **Type:** ${community.type}\n`;
      if (community.founded) {
        markdown += `- **Founded:** ${community.founded}\n`;
      }
      if (community.website) {
        markdown += `- **Website:** ${community.website}\n`;
      }
      if (community.enrichedData?.upcomingEvents > 0) {
        markdown += `- **Upcoming Events:** ${community.enrichedData.upcomingEvents}\n`;
      }
      markdown += `- **Description:** ${community.enrichedData.contextualDescription}\n`;
      markdown += `\n`;
    });
  }

  if (data.locations) {
    markdown += `## Event Locations (${data.locations.length})\n\n`;
    data.locations.forEach((location: any) => {
      markdown += `### ${location.name}\n`;
      markdown += `- **Type:** ${location.type}\n`;
      markdown += `- **Address:** ${location.address}\n`;
      if (location.enrichedData?.upcomingEvents > 0) {
        markdown += `- **Upcoming Events:** ${location.enrichedData.upcomingEvents}\n`;
      }
      markdown += `- **Description:** ${location.enrichedData.contextualDescription}\n`;
      markdown += `\n`;
    });
  }

  return markdown;
} 