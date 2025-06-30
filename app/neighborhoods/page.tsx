import { Metadata } from 'next'
import events from '@/public/data/events.json'
import locations from '@/public/data/locations.json'
import communities from '@/public/data/communities.json'

export const metadata: Metadata = {
  title: 'NYC Tech Events by Neighborhood | Manhattan, Brooklyn, Queens & More',
  description: 'Discover tech events, meetups, and communities in every NYC neighborhood. From Manhattan\'s Financial District to Brooklyn\'s DUMBO, find local tech events near you.',
  keywords: 'NYC neighborhoods, Manhattan tech events, Brooklyn tech meetups, Queens tech community, Bronx technology, Staten Island events, local tech events, NYC boroughs',
  openGraph: {
    title: 'NYC Tech Events by Neighborhood',
    description: 'Find tech events in your NYC neighborhood - Manhattan, Brooklyn, Queens, Bronx, and Staten Island.',
    url: 'https://nycevents.vercel.app/neighborhoods',
    type: 'website',
  },
  alternates: {
    canonical: 'https://nycevents.vercel.app/neighborhoods',
  },
}

interface NeighborhoodData {
  name: string;
  borough: string;
  description: string;
  eventCount: number;
  topVenues: string[];
  activeCommunities: string[];
  keywords: string[];
  highlights: string[];
}

// Define NYC neighborhoods with tech activity
const neighborhoods: NeighborhoodData[] = [
  {
    name: "Midtown Manhattan",
    borough: "Manhattan",
    description: "Heart of NYC business district with major tech companies, coworking spaces, and corporate events",
    eventCount: 0,
    topVenues: ["WeWork locations", "Corporate offices", "Conference centers"],
    activeCommunities: [],
    keywords: ["midtown", "corporate tech", "business district", "networking"],
    highlights: ["Prime location for corporate tech events", "Easy transit access", "Major coworking hubs"]
  },
  {
    name: "Financial District",
    borough: "Manhattan",
    description: "Historic financial center now home to fintech startups and financial technology innovation",
    eventCount: 0,
    topVenues: ["Stone Street area", "Financial centers", "Startup spaces"],
    activeCommunities: [],
    keywords: ["fintech", "financial district", "wall street", "blockchain"],
    highlights: ["Fintech startup ecosystem", "Historic venue options", "Growing tech community"]
  },
  {
    name: "SoHo/NoLita",
    borough: "Manhattan",
    description: "Creative hub attracting design-focused tech companies and artistic technology events",
    eventCount: 0,
    topVenues: ["Art galleries", "Creative spaces", "Design studios"],
    activeCommunities: [],
    keywords: ["design tech", "creative technology", "soho", "design thinking"],
    highlights: ["Design and tech intersection", "Creative venue spaces", "Artistic tech community"]
  },
  {
    name: "Union Square",
    borough: "Manhattan",
    description: "Central meeting point with diverse tech meetups and accessibility from all boroughs",
    eventCount: 0,
    topVenues: ["Union Square venues", "NYU area spaces", "Central meetup spots"],
    activeCommunities: [],
    keywords: ["union square", "central location", "meetups", "accessibility"],
    highlights: ["Central transit hub", "Diverse event types", "Easy access from all boroughs"]
  },
  {
    name: "Chelsea",
    borough: "Manhattan",
    description: "Tech corridor with major companies like Google and innovative startup ecosystem",
    eventCount: 0,
    topVenues: ["Google NYC", "Chelsea Market", "Tech company offices"],
    activeCommunities: [],
    keywords: ["chelsea", "google nyc", "tech corridor", "startups"],
    highlights: ["Major tech company presence", "Innovation hub", "Startup accelerators"]
  },
  {
    name: "DUMBO",
    borough: "Brooklyn",
    description: "Brooklyn's premier tech district with stunning venues and growing startup scene",
    eventCount: 0,
    topVenues: ["Brooklyn Bridge Park", "Waterfront venues", "Tech offices"],
    activeCommunities: [],
    keywords: ["dumbo", "brooklyn tech", "waterfront events", "startups"],
    highlights: ["Scenic event venues", "Growing startup ecosystem", "Unique Brooklyn tech culture"]
  },
  {
    name: "Williamsburg",
    borough: "Brooklyn",
    description: "Hip Brooklyn neighborhood with creative tech scene and innovative event spaces",
    eventCount: 0,
    topVenues: ["Creative spaces", "Warehouses", "Artisanal venues"],
    activeCommunities: [],
    keywords: ["williamsburg", "creative tech", "brooklyn events", "innovation"],
    highlights: ["Creative tech community", "Unique venue options", "Artistic technology focus"]
  },
  {
    name: "Long Island City",
    borough: "Queens",
    description: "Emerging tech hub in Queens with affordable venues and growing community",
    eventCount: 0,
    topVenues: ["LIC coworking spaces", "Industrial venues", "Queens tech centers"],
    activeCommunities: [],
    keywords: ["long island city", "queens tech", "emerging tech hub", "affordable venues"],
    highlights: ["Emerging tech scene", "Affordable event spaces", "Growing community"]
  },
];

function getEventsForNeighborhood(neighborhood: string): any[] {
  return (events?.events || []).filter((event: any) => {
    const location = locations?.locations?.find((l: any) => l.id === event.locationId);
    return location?.address?.toLowerCase().includes(neighborhood.toLowerCase()) ||
           location?.name?.toLowerCase().includes(neighborhood.toLowerCase());
  });
}

function getCommunitiesForNeighborhood(neighborhood: string): any[] {
  return (communities?.communities || []).filter((community: any) => {
    return community.description?.toLowerCase().includes(neighborhood.toLowerCase()) ||
           community.name?.toLowerCase().includes(neighborhood.toLowerCase());
  });
}

export default function NeighborhoodsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-4 text-primary">NYC Tech Events by Neighborhood</h1>
      <p>Coming soon...</p>
    </div>
  );
} 