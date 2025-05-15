import type { Metadata } from "next";
import AboutClient from "./AboutClient";

export const metadata: Metadata = {
  title: "About Joshua Spergel | NYC Events & Tech",
  description: "Learn more about Joshua Spergel, the creator of NYC Events. Discover his projects, interests in web scraping, and how to get in touch.",
  openGraph: {
    title: "About Joshua Spergel | NYC Events & Tech",
    description: "Learn more about Joshua Spergel, the creator of NYC Events.",
    url: "https://nycevents.vercel.app/about",
    type: "profile",
    images: [
      {
        url: "https://nycevents.vercel.app/joshua_spergel_profile.jpg",
        width: 800,
        height: 800,
        alt: "Joshua Spergel"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    site: "@nycdosomething",
    creator: "@nycdosomething",
    title: "About Joshua Spergel | NYC Events & Tech",
    description: "Creator of somethingtodo.nyc, web scraping enthusiast, living near NYC.",
    images: ["https://nycevents.vercel.app/joshua_spergel_profile.jpg"]
  }
};

export default function AboutPage() {
  return <AboutClient />;
} 