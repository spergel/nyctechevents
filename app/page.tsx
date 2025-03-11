import type { Metadata } from "next";
import HomeClient from './HomeClient';

export const metadata: Metadata = {
  title: "NYC Events & Communities | New York City Tech Hub",
  description: "Your futuristic guide to New York City's tech scene. Discover events, communities, locations, and newsletters with our cyberpunk interface. Stay connected with NYC's innovation ecosystem.",
  openGraph: {
    title: "NYC Events & Communities | New York City Tech Hub",
    description: "Your futuristic guide to New York City's tech scene. Discover events, communities, locations, and newsletters with our cyberpunk interface.",
    url: "https://nycevents.vercel.app",
    type: "website",
  },
};

// Server component that returns the client component
export default function Home() {
  return <HomeClient />;
}