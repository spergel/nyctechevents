import type { Metadata } from "next";
import CommunitiesClient from "./CommunitiesClient";

export const metadata: Metadata = {
  title: "NYC Tech Communities | Connect with Technology Groups in New York",
  description: "Explore technology communities, developer groups, and tech organizations in New York City. Find your tech tribe, connect with like-minded individuals, and grow your network.",
  openGraph: {
    title: "NYC Tech Communities | Connect with Technology Groups in New York",
    description: "Explore technology communities, developer groups, and tech organizations in New York City. Find your tech tribe and connect with like-minded individuals.",
    url: "https://nycevents.vercel.app/communities",
    type: "website",
    images: [
      {
        url: "https://nycevents.vercel.app/og-communities.jpg",
        width: 1200,
        height: 630,
        alt: "NYC Tech Communities"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    site: "@nycdosomething",
    creator: "@nycdosomething",
    images: ["https://nycevents.vercel.app/og-communities.jpg"]
  }
};

export default function CommunitiesPage() {
  return <CommunitiesClient />;
}