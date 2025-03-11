import type { Metadata } from "next";
import SubstacksClient from "./SubstacksClient";

export const metadata: Metadata = {
  title: "NYC Newsletters & Blogs | New York City Tech Publications",
  description: "Find the best newsletters, Substacks, and blogs about New York City tech, startup, and innovation scenes. Stay informed about the latest NYC tech trends and news.",
  openGraph: {
    title: "NYC Newsletters & Blogs | New York City Tech Publications",
    description: "Find the best newsletters, Substacks, and blogs about New York City tech, startup, and innovation scenes. Stay informed about the latest NYC tech trends.",
    url: "https://nycevents.vercel.app/substacks",
    type: "website",
    images: [
      {
        url: "https://nycevents.vercel.app/og-substacks.jpg",
        width: 1200,
        height: 630,
        alt: "NYC Newsletters & Blogs"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    site: "@nycdosomething",
    creator: "@nycdosomething",
    images: ["https://nycevents.vercel.app/og-substacks.jpg"]
  }
};

export default function SubstacksPage() {
  return <SubstacksClient />;
} 