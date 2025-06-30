import './globals.css'
import type { Metadata } from 'next'
import { MainframeHeader } from './components/ui/MainframeHeader'
import { Analytics } from '@vercel/analytics/react'
import { WebsiteJsonLd } from './components/EnhancedJsonLd';

export const metadata: Metadata = {
  title: 'NYC Events & Communities | Your Cyberpunk Guide to New York',
  description: 'Discover upcoming NYC events, tech communities, and cool locations with our futuristic cyberpunk interface. Connect with NYC builders, creators, and innovators.',
  keywords: 'NYC events, New York communities, tech meetups, NYC builders, cyberpunk interface, New York tech scene, NYC locations',
  openGraph: {
    title: 'NYC Events & Communities | Your Cyberpunk Guide to New York',
    description: 'Discover upcoming NYC events, tech communities, and cool locations with our futuristic cyberpunk interface. Connect with NYC builders, creators, and innovators.',
    url: 'https://nycevents.vercel.app',
    siteName: 'NYC Events & Communities',
    images: [{
      url: '/nyc_skyline.gif',
      width: 1200,
      height: 630,
      alt: 'NYC Events & Communities Cyberpunk Interface',
    }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NYC Events & Communities | Your Cyberpunk Guide to New York',
    description: 'Discover upcoming NYC events, tech communities, and cool locations with our futuristic cyberpunk interface.',
    creator: '@nycdosomething',
    images: ['/nyc_skyline.gif'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <WebsiteJsonLd 
          url="https://nycevents.vercel.app"
          name="NYC Events & Communities"
          description="Your futuristic guide to New York City's tech scene. Discover events, communities, locations, and newsletters with our cyberpunk interface."
        />
        <div className="container">
          <MainframeHeader />
          <main className="main-content">
            {children}
          </main>
        </div>
        <Analytics />
      </body>
    </html>
  )
}
