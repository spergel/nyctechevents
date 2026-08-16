import type { Metadata } from "next";
import LocationsClient from "./LocationsClient";
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: "NYC Tech Venues & Spaces | Technology Hubs in New York City",
  description: "Discover tech-focused venues, coworking spaces, and innovation hubs in New York City. Find the perfect space for your next meetup, hackathon, or tech event.",
  openGraph: {
    title: "NYC Tech Venues & Spaces | Technology Hubs in New York City",
    description: "Discover tech-focused venues, coworking spaces, and innovation hubs in New York City. Find the perfect space for your next meetup or tech event.",
    url: `${SITE_URL}/locations`,
    type: "website",
    images: [
      {
        url: `${SITE_URL}/og-locations.jpg`,
        width: 1200,
        height: 630,
        alt: "NYC Tech Venues & Spaces"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    site: "@nycdosomething",
    creator: "@nycdosomething",
    images: [`${SITE_URL}/og-locations.jpg`]
  }
};

export default function LocationsPage() {
  return <LocationsClient />;
} 