import { NextResponse, NextRequest } from 'next/server';
import events from '@/public/data/events.json';
import communities from '@/public/data/communities.json';
import locations from '@/public/data/locations.json';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'week'; // week, month, quarter
    const format = searchParams.get('format') || 'json';

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStart, 1);
        break;
      default: // week
        startDate = new Date(now.setDate(now.getDate() - 7));
    }

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30); // Look ahead 30 days

    // Filter events for the period
    const periodEvents = (events?.events || [])
      .filter((event: any) => {
        const eventDate = new Date(event.startDate);
        return eventDate >= startDate && eventDate <= endDate;
      })
      .sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    // Analyze trends and patterns
    const eventsByType = periodEvents.reduce((acc: any, event: any) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {});

    const eventsByCommunity = periodEvents.reduce((acc: any, event: any) => {
      const community = communities?.communities?.find((c: any) => c.id === event.communityId);
      if (community) {
        acc[community.name] = (acc[community.name] || 0) + 1;
      }
      return acc;
    }, {});

    const freeEvents = periodEvents.filter((event: any) => 
      event.price?.type === 'Free' || event.price?.amount === 0
    ).length;

    const digest = {
      metadata: {
        title: `NYC Tech Events Digest - ${period.charAt(0).toUpperCase() + period.slice(1)}`,
        period: period,
        dateRange: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        },
        generatedAt: new Date().toISOString(),
        summary: `Comprehensive overview of NYC's tech event landscape for ${period}`,
      },
      
      overview: {
        totalEvents: periodEvents.length,
        freeEvents: freeEvents,
        paidEvents: periodEvents.length - freeEvents,
        activeCommunities: Object.keys(eventsByCommunity).length,
        topEventType: Object.entries(eventsByType).sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'N/A',
      },

      insights: {
        trends: generateTrends(eventsByType, eventsByCommunity),
        recommendations: generateRecommendations(periodEvents),
        hotspots: generateHotspots(periodEvents),
      },

      upcomingHighlights: periodEvents.slice(0, 10).map((event: any) => {
        const community = communities?.communities?.find((c: any) => c.id === event.communityId);
        const location = locations?.locations?.find((l: any) => l.id === event.locationId);
        
        return {
          name: event.name,
          date: new Date(event.startDate).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          }),
          type: event.type,
          organizer: community?.name || 'Unknown',
          location: location?.name || 'TBD',
          price: event.price?.type === 'Free' ? 'Free' : `$${event.price?.amount || 0}`,
          description: event.description?.slice(0, 150) + '...' || 'Event details coming soon',
          url: `https://nycevents.vercel.app/events/${event.id}`,
          aiSummary: `${event.name} is a ${event.type} event hosted by ${community?.name || 'community organizers'} on ${new Date(event.startDate).toDateString()}. ${event.description?.slice(0, 100) || 'This event focuses on NYC tech community building.'}`
        };
      }),

      communitySpotlight: Object.entries(eventsByCommunity)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 5)
        .map(([name, count]) => {
          const community = communities?.communities?.find((c: any) => c.name === name);
          return {
            name,
            eventsHosting: count,
            type: community?.type || 'Community',
            description: community?.description || `Active NYC tech community`,
            website: community?.website,
            founded: community?.founded,
          };
        }),

      narrativeSummary: generateNarrativeSummary(periodEvents, eventsByType, eventsByCommunity, period),
    };

    if (format === 'markdown') {
      const markdown = generateMarkdownDigest(digest);
      return new NextResponse(markdown, {
        headers: {
          'Content-Type': 'text/markdown',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    return NextResponse.json(digest, {
      headers: {
        'Cache-Control': 'public, max-age=3600',
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('Error generating AI digest:', error);
    return new NextResponse('Error generating AI digest', { status: 500 });
  }
}

function generateTrends(eventsByType: any, eventsByCommunity: any): string[] {
  const trends = [];
  
  const topType = Object.entries(eventsByType).sort(([,a], [,b]) => (b as number) - (a as number))[0];
  if (topType) {
    trends.push(`${topType[0]} events are leading with ${topType[1]} scheduled events`);
  }
  
  const activeCommunities = Object.keys(eventsByCommunity).length;
  trends.push(`${activeCommunities} different communities are actively hosting events`);
  
  return trends;
}

function generateRecommendations(events: any[]): string[] {
  const recommendations = [];
  
  const freeEvents = events.filter(e => e.price?.type === 'Free').length;
  const paidEvents = events.length - freeEvents;
  
  if (freeEvents > paidEvents) {
    recommendations.push("Great time for newcomers - majority of events are free to attend");
  }
  
  if (events.length > 10) {
    recommendations.push("High activity period - consider planning your schedule in advance");
  }
  
  recommendations.push("Mix of beginner and advanced events available - check event descriptions for your level");
  
  return recommendations;
}

function generateHotspots(events: any[]): string[] {
  // Simple location analysis
  const hotspots = ["Manhattan remains the primary hub for tech events"];
  if (events.length > 15) {
    hotspots.push("Brooklyn tech scene showing strong activity");
  }
  return hotspots;
}

function generateNarrativeSummary(events: any[], eventsByType: any, eventsByCommunity: any, period: string): string {
  const totalEvents = events.length;
  const topType = Object.entries(eventsByType).sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0];
  const activeCommunities = Object.keys(eventsByCommunity).length;
  const freeEvents = events.filter(e => e.price?.type === 'Free').length;

  return `NYC's tech ecosystem continues to thrive with ${totalEvents} events scheduled for this ${period}. ${topType} events are particularly prominent, representing the community's current interests. With ${activeCommunities} different organizations hosting events and ${freeEvents} free opportunities available, there are diverse pathways for tech professionals to connect, learn, and grow. The landscape shows a healthy mix of established communities and emerging groups, indicating a vibrant and evolving tech scene in New York City.`;
}

function generateMarkdownDigest(digest: any): string {
  let markdown = `# ${digest.metadata.title}\n\n`;
  markdown += `*Generated on ${new Date(digest.metadata.generatedAt).toLocaleDateString()}*\n\n`;
  markdown += digest.narrativeSummary + '\n\n';
  
  markdown += `## Overview\n`;
  markdown += `- **Total Events:** ${digest.overview.totalEvents}\n`;
  markdown += `- **Free Events:** ${digest.overview.freeEvents}\n`;
  markdown += `- **Active Communities:** ${digest.overview.activeCommunities}\n`;
  markdown += `- **Top Event Type:** ${digest.overview.topEventType}\n\n`;
  
  markdown += `## Key Insights\n`;
  digest.insights.trends.forEach((trend: string) => {
    markdown += `- ${trend}\n`;
  });
  markdown += '\n';
  
  markdown += `## Recommendations\n`;
  digest.insights.recommendations.forEach((rec: string) => {
    markdown += `- ${rec}\n`;
  });
  markdown += '\n';
  
  markdown += `## Upcoming Highlights\n`;
  digest.upcomingHighlights.forEach((event: any) => {
    markdown += `### ${event.name}\n`;
    markdown += `- **When:** ${event.date}\n`;
    markdown += `- **Type:** ${event.type}\n`;
    markdown += `- **Organizer:** ${event.organizer}\n`;
    markdown += `- **Price:** ${event.price}\n`;
    markdown += `- **AI Summary:** ${event.aiSummary}\n\n`;
  });
  
  return markdown;
} 