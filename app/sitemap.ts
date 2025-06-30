import { MetadataRoute } from 'next'
import events from '@/public/data/events.json'
import communities from '@/public/data/communities.json'
import locations from '@/public/data/locations.json'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://nycevents.vercel.app'
  
  // Main pages
  const mainPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/events`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/communities`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/locations`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/neighborhoods`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
  ]

  // Individual event pages
  const eventPages = (events?.events || [])
    .filter((event: any) => new Date(event.startDate) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) // Include recent past events
    .map((event: any) => ({
      url: `${baseUrl}/events/${event.id}`,
      lastModified: new Date(event.startDate),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))

  // Community pages
  const communityPages = (communities?.communities || []).map((community: any) => ({
    url: `${baseUrl}/communities/${community.id}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  // Location pages
  const locationPages = (locations?.locations || []).map((location: any) => ({
    url: `${baseUrl}/locations/${location.id}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  return [
    ...mainPages,
    ...eventPages,
    ...communityPages,
    ...locationPages,
  ]
} 