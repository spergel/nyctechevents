import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import events from '@/public/data/events.json'
import communities from '@/public/data/communities.json'
import locations from '@/public/data/locations.json'
import EventJsonLd from '@/app/components/EventJsonLd'
import { Event, Community, Location } from '@/app/types'

interface Props {
  params: Promise<{ id: string }>
}

function getEvent(id: string): any | null {
  const event = events?.events?.find((e: any) => e.id === id)
  return event || null
}

function getCommunity(id: string): any | null {
  const community = communities?.communities?.find((c: any) => c.id === id)
  return community || null
}

function getLocation(id: string): any | null {
  const location = locations?.locations?.find((l: any) => l.id === id)
  return location || null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const event = getEvent(id)
  
  if (!event) {
    return {
      title: 'Event Not Found | NYC Events',
      description: 'The requested event could not be found.',
    }
  }

  const community = getCommunity(event.communityId)
  const location = getLocation(event.locationId)
  
  const eventDate = new Date(event.startDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  
  const title = `${event.name} | ${eventDate} | NYC Events`
  const description = event.description 
    ? `${event.description.slice(0, 150)}...`
    : `Join ${event.name} on ${eventDate} in NYC. ${community?.name ? `Hosted by ${community.name}.` : ''} ${location?.name ? `Located at ${location.name}.` : ''}`

  return {
    title,
    description,
    keywords: [
      event.name,
      event.type,
      'NYC event',
      'New York',
      community?.name,
      location?.name,
      eventDate,
      ...(event.metadata?.venue?.name ? [event.metadata.venue.name] : []),
      ...(event.category && typeof event.category === 'string' ? [event.category] : []),
      ...(event.category && typeof event.category === 'object' && event.category.name ? [event.category.name] : []),
    ].filter(Boolean).join(', '),
    openGraph: {
      title,
      description,
      url: `https://nycevents.vercel.app/events/${event.id}`,
      type: 'article',
      publishedTime: event.startDate,
      modifiedTime: event.endDate || event.startDate,
      images: event.image ? [`https://nycevents.vercel.app/${event.image}`] : ['/nyc_skyline.gif'],
      authors: community?.name ? [community.name] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: event.image ? [`https://nycevents.vercel.app/${event.image}`] : ['/nyc_skyline.gif'],
    },
    alternates: {
      canonical: `https://nycevents.vercel.app/events/${event.id}`,
    },
  }
}

export async function generateStaticParams() {
  return events?.events?.map((event: any) => ({
    id: event.id,
  })) || []
}

export default async function EventPage({ params }: Props) {
  const { id } = await params
  const event = getEvent(id)
  
  if (!event) {
    notFound()
  }

  const community = getCommunity(event.communityId)
  const location = getLocation(event.locationId)

  return (
    <>
      <EventJsonLd event={event} />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Event Image */}
          {event.image && (
            <div className="mb-8">
              <img 
                src={`/${event.image}`} 
                alt={event.name}
                className="w-full h-64 object-cover rounded-lg"
              />
            </div>
          )}

          {/* Event Header */}
          <header className="mb-8">
            <h1 className="text-4xl font-bold mb-4 text-primary">{event.name}</h1>
            
            {/* Event Meta */}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
              <time dateTime={event.startDate} className="flex items-center gap-2">
                📅 {new Date(event.startDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </time>
              
              {location && (
                <span className="flex items-center gap-2">
                  📍 <a href={`/locations/${location.id}`} className="hover:text-primary">{location.name}</a>
                </span>
              )}
              
              {community && (
                <span className="flex items-center gap-2">
                  👥 <a href={`/communities/${community.id}`} className="hover:text-primary">{community.name}</a>
                </span>
              )}
              
              {event.price && (
                <span className="flex items-center gap-2">
                  💰 {event.price.type === 'Free' ? 'Free' : `$${event.price.amount}`}
                </span>
              )}
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-6">
              {event.type && (
                <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm">
                  {event.type}
                </span>
              )}
              {event.category && typeof event.category === 'string' && event.category !== event.type && (
                <span className="px-3 py-1 bg-secondary/20 text-secondary rounded-full text-sm">
                  {event.category}
                </span>
              )}
              {event.category && typeof event.category === 'object' && event.category.name && (
                <span className="px-3 py-1 bg-secondary/20 text-secondary rounded-full text-sm">
                  {event.category.name}
                </span>
              )}
            </div>
          </header>

          {/* Event Description */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">About This Event</h2>
            <div className="prose prose-lg max-w-none">
              <p className="text-lg leading-relaxed">{event.description || 'Event details will be updated soon.'}</p>
            </div>
          </section>

          {/* Event Details */}
          <section className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Location Details */}
            {location && (
              <div>
                <h3 className="text-xl font-semibold mb-3">Location</h3>
                <div className="space-y-2">
                  <p className="font-medium">{location.name}</p>
                  <p className="text-muted-foreground">{location.address}</p>
                  {location.description && (
                    <p className="text-sm">{location.description}</p>
                  )}
                </div>
              </div>
            )}

            {/* Community Details */}
            {community && (
              <div>
                <h3 className="text-xl font-semibold mb-3">Organizer</h3>
                <div className="space-y-2">
                  <p className="font-medium">{community.name}</p>
                  <p className="text-muted-foreground">{community.type}</p>
                  {community.description && (
                    <p className="text-sm">{community.description}</p>
                  )}
                  {community.website && (
                    <a 
                      href={community.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm"
                    >
                      Visit Website →
                    </a>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Registration/Source Link */}
          {event.metadata?.source_url && (
            <section className="text-center py-8">
              <a 
                href={event.metadata.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-primary text-primary-foreground px-8 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Register for Event →
              </a>
            </section>
          )}

          {/* Related Links */}
          <nav className="mt-12 pt-8 border-t">
            <h3 className="text-lg font-semibold mb-4">Explore More</h3>
            <div className="flex flex-wrap gap-4">
              <a href="/events" className="text-primary hover:underline">← Back to All Events</a>
              {community && (
                <a href={`/communities/${community.id}`} className="text-primary hover:underline">
                  More from {community.name} →
                </a>
              )}
              {location && (
                <a href={`/locations/${location.id}`} className="text-primary hover:underline">
                  Events at {location.name} →
                </a>
              )}
            </div>
          </nav>
        </div>
      </div>
    </>
  )
} 