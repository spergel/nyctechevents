import type { Metadata } from "next";
import LocationsClient from "./LocationsClient";

export const metadata: Metadata = {
  title: "NYC Tech Venues & Spaces | Technology Hubs in New York City",
  description: "Discover tech-focused venues, coworking spaces, and innovation hubs in New York City. Find the perfect space for your next meetup, hackathon, or tech event.",
  openGraph: {
    title: "NYC Tech Venues & Spaces | Technology Hubs in New York City",
    description: "Discover tech-focused venues, coworking spaces, and innovation hubs in New York City. Find the perfect space for your next meetup or tech event.",
    url: "https://nycevents.vercel.app/locations",
    type: "website",
    images: [
      {
        url: "https://nycevents.vercel.app/og-locations.jpg",
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
    images: ["https://nycevents.vercel.app/og-locations.jpg"]
  }
};

export default function LocationsPage() {
  return <LocationsClient />;
} 