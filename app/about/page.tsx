import type { Metadata } from "next";
import AboutClient from "./AboutClient";
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: "About Joshua Spergel | NYC Events & Tech",
  description: "Learn more about Joshua Spergel, the creator of NYC Events. Discover his projects, interests in web scraping, and how to get in touch.",
  openGraph: {
    title: "About Joshua Spergel | NYC Events & Tech",
    description: "Learn more about Joshua Spergel, the creator of NYC Events.",
    url: `${SITE_URL}/about`,
    type: "profile",
    images: [
      {
        url: `${SITE_URL}/joshua_spergel_profile.jpg`,
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
    images: [`${SITE_URL}/joshua_spergel_profile.jpg`]
  }
};

export default function AboutPage() {
  return <AboutClient />;
} 