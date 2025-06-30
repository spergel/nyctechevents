import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import communities from '@/public/data/communities.json'
import events from '@/public/data/events.json'
import locations from '@/public/data/locations.json'
import { OrganizationJsonLd, EventSeriesJsonLd } from '@/app/components/EnhancedJsonLd'

interface Props {
  params: { id: string }
}

function getCommunity(id: string): any | null {
  const community = communities?.communities?.find((c: any) => c.id === id)
  return community || null
}

function getCommunityEvents(communityId: string): any[] {
  return events?.events?.filter((event: any) => 
    event.communityId === communityId && 
    new Date(event.startDate) > new Date()
  ).sort((a: any, b: any) => 
    new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  ) || []
}

function getLocation(id: string): any | null {
  const location = locations?.locations?.find((l: any) => l.id === id)
  return location || null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const community = getCommunity(params.id)
  
  if (!community) {
    return {
      title: 'Community Not Found | NYC Events',
      description: 'The requested community could not be found.',
    }
  }

  const title = `${community.name} | NYC Tech Community`
  const description = community.description 
    ? `${community.description} Join ${community.name}, a ${community.type} community in NYC. ${community.founded ? `Founded in ${community.founded}.` : ''}`
    : `${community.name} is a ${community.type} community in New York City. Connect with members and discover upcoming events.`

  return {
    title,
    description,
    keywords: [
      community.name,
      community.type,
      'NYC community',
      'New York',
      'tech',
      'meetup',
      ...(community.category || []),
      ...(community.tags || []),
    ].filter(Boolean).join(', '),
    openGraph: {
      title,
      description,
      url: `https://nycevents.vercel.app/communities/${community.id}`,
      type: 'profile',
      images: community.image ? [`https://nycevents.vercel.app/${community.image}`] : ['/nyc_skyline.gif'],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: community.image ? [`https://nycevents.vercel.app/${community.image}`] : ['/nyc_skyline.gif'],
    },
    alternates: {
      canonical: `https://nycevents.vercel.app/communities/${community.id}`,
    },
  }
}

export async function generateStaticParams() {
  return communities?.communities?.map((community: any) => ({
    id: community.id,
  })) || []
}

export default function CommunityPage({ params }: Props) {
  const community = getCommunity(params.id)
  
  if (!community) {
    notFound()
  }

  const communityEvents = getCommunityEvents(community.id)
  const mainLocation = community.meetingLocationIds?.[0] ? getLocation(community.meetingLocationIds[0]) : null

  return (
    <>
      <OrganizationJsonLd organization={community} />
      {communityEvents.length > 0 && (
        <EventSeriesJsonLd 
          events={communityEvents}
          community={community}
          location={mainLocation}
        />
      )}
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Community Header */}
          <header className="mb-8">
            {community.image && (
              <div className="mb-6">
                <img 
                  src={`/${community.image}`} 
                  alt={community.name}
                  className="w-32 h-32 object-cover rounded-lg mx-auto"
                />
              </div>
            )}
            
            <h1 className="text-4xl font-bold mb-4 text-primary text-center">{community.name}</h1>
            
            {/* Community Meta */}
            <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground mb-6">
              <span className="flex items-center gap-2">
                🏢 {community.type}
              </span>
              
              {community.founded && (
                <span className="flex items-center gap-2">
                  📅 Founded {community.founded}
                </span>
              )}
              
              {community.size && community.size !== '0' && (
                <span className="flex items-center gap-2">
                  👥 {community.size} members
                </span>
              )}
              
              {community.membershipType && (
                <span className="flex items-center gap-2">
                  🎫 {community.membershipType}
                </span>
              )}
            </div>

            {/* Categories */}
            {community.category && community.category.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {community.category.map((cat: string, index: number) => (
                  <span key={index} className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm">
                    {cat}
                  </span>
                ))}
              </div>
            )}
          </header>

          {/* Community Description */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">About {community.name}</h2>
            <div className="prose prose-lg max-w-none">
              <p className="text-lg leading-relaxed">
                {community.description || `${community.name} is a ${community.type} community in New York City.`}
              </p>
            </div>
          </section>

          {/* Contact & Links */}
          <section className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Contact Info */}
            <div>
              <h3 className="text-xl font-semibold mb-3">Get In Touch</h3>
              <div className="space-y-2">
                {community.website && (
                  <p>
                    <span className="font-medium">Website: </span>
                    <a 
                      href={community.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {community.website}
                    </a>
                  </p>
                )}
                
                {community.contact?.email && (
                  <p>
                    <span className="font-medium">Email: </span>
                    <a 
                      href={`mailto:${community.contact.email}`}
                      className="text-primary hover:underline"
                    >
                      {community.contact.email}
                    </a>
                  </p>
                )}
                
                {community.contact?.phone && (
                  <p>
                    <span className="font-medium">Phone: </span>
                    <a 
                      href={`tel:${community.contact.phone}`}
                      className="text-primary hover:underline"
                    >
                      {community.contact.phone}
                    </a>
                  </p>
                )}
              </div>
            </div>

            {/* Social Links */}
            {community.contact?.social && (
              <div>
                <h3 className="text-xl font-semibold mb-3">Follow Us</h3>
                <div className="space-y-2">
                  {Object.entries(community.contact.social).map(([platform, handle]) => (
                    <p key={platform}>
                      <span className="font-medium capitalize">{platform}: </span>
                      <a 
                        href={
                          platform === 'twitter' ? `https://twitter.com/${handle?.toString().replace('@', '')}` :
                          platform === 'instagram' ? `https://instagram.com/${handle?.toString().replace('@', '')}` :
                          platform === 'linkedin' ? `https://linkedin.com/company/${handle}` :
                          platform === 'facebook' ? `https://facebook.com/${handle}` :
                          platform === 'discord' ? `https://${handle}` :
                          handle?.toString() || '#'
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {handle?.toString()}
                      </a>
                    </p>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Upcoming Events */}
          {communityEvents.length > 0 && (
            <section className="mb-8">
              <h3 className="text-2xl font-semibold mb-4">Upcoming Events</h3>
              <div className="grid gap-4">
                {communityEvents.slice(0, 5).map((event: any) => (
                  <div key={event.id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                    <h4 className="font-semibold text-lg mb-2">
                      <a href={`/events/${event.id}`} className="text-primary hover:underline">
                        {event.name}
                      </a>
                    </h4>
                    <p className="text-muted-foreground text-sm mb-2">
                      📅 {new Date(event.startDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                    {event.description && (
                      <p className="text-sm line-clamp-2">{event.description}</p>
                    )}
                  </div>
                ))}
                
                {communityEvents.length > 5 && (
                  <div className="text-center">
                    <a 
                      href={`/events?community=${community.id}`}
                      className="text-primary hover:underline"
                    >
                      View all {communityEvents.length} upcoming events →
                    </a>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Tags */}
          {community.tags && community.tags.length > 0 && (
            <section className="mb-8">
              <h3 className="text-xl font-semibold mb-3">Topics</h3>
              <div className="flex flex-wrap gap-2">
                {community.tags.map((tag: string, index: number) => (
                  <span key={index} className="px-3 py-1 bg-secondary/20 text-secondary rounded-full text-sm">
                    {tag}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Navigation */}
          <nav className="mt-12 pt-8 border-t">
            <div className="flex flex-wrap gap-4">
              <a href="/communities" className="text-primary hover:underline">← Back to All Communities</a>
              <a href="/events" className="text-primary hover:underline">Browse Events →</a>
              <a href="/locations" className="text-primary hover:underline">Find Venues →</a>
            </div>
          </nav>
        </div>
      </div>
    </>
  )
} 