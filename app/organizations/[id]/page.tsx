'use client';
import React, { use } from 'react';
import communities from '@/public/data/communities.json';
import locations from '@/public/data/locations.json';
import events from '@/public/data/events.json';
import { Panel } from '@/app/components/ui/Panel';
import { DetailSection } from '@/app/components/ui/DetailSection';
import { MetaInfo } from '@/app/components/ui/MetaInfo';
import { CyberMap } from '@/app/components/ui/CyberMap';
import { CyberLink } from '@/app/components/ui/CyberLink';

export default function Organization(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const community = communities.communities.find(c => c.id === params.id);
  const location = locations.locations.find(l => l.primaryCommunityId === params.id);
  
  const upcomingEvents = events.events
    .filter(e => 
      e.locationId === location?.id || 
      e.communityId === community?.id ||
      e.metadata?.venue?.name === location?.name
    )
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 5);

  const hostedCommunities = communities.communities.filter(c => 
    c.meetingLocationIds?.includes(location?.id || '')
  );

  if (!community || !location) {
    return (
      <main>
        <MetaInfo data={{
          'ERROR': `Organization with ID "${params.id}" not found`,
          'MESSAGE': 'Please check the ID and try again...'
        }} />
      </main>
    );
  }

  return (
    <main className="org-page">
      <div className="org-grid">
        <div className="main-content">
          <Panel title={community.name.toUpperCase()} systemId="ORG-001" variant="primary">
            <MetaInfo data={{
              'Type': community.type,
              'Founded': community.founded,
              'Status': community.organizationType === 'venue_community' ? 'Venue & Community' : 'Community',
              'Address': location.address,
              'Website': community.website
            }} />

            <DetailSection title="About">
              <p>{community.description}</p>
            </DetailSection>

            {location.hours && (
              <DetailSection title="Hours">
                <MetaInfo data={location.hours} />
              </DetailSection>
            )}

            {location.amenities && (
              <DetailSection title="Amenities">
                <div className="amenities-grid">
                  {location.amenities.map((amenity, index) => (
                    <div key={index} className="amenity-tag">{amenity}</div>
                  ))}
                </div>
              </DetailSection>
            )}

            {upcomingEvents.length > 0 && (
              <DetailSection title="Upcoming Events">
                <div className="events-list">
                  {upcomingEvents.map(event => (
                    <CyberLink key={event.id} href={`/events/${event.id}`} variant="event">
                      <div className="event-date">{new Date(event.startDate).toLocaleDateString()}</div>
                      <div className="event-name">{event.name}</div>
                      <div className="event-type">{event.type}</div>
                    </CyberLink>
                  ))}
                </div>
              </DetailSection>
            )}

            {hostedCommunities.length > 0 && (
              <DetailSection title="Communities That Meet Here">
                <div className="communities-list">
                  {hostedCommunities.map(comm => (
                    <CyberLink key={comm.id} href={`/communities/${comm.id}`} variant="community">
                      <div className="community-type">{comm.type}</div>
                      <div className="community-name">{comm.name}</div>
                    </CyberLink>
                  ))}
                </div>
              </DetailSection>
            )}
          </Panel>
        </div>

        <div className="side-content">
          <Panel title="LOCATION" systemId="MAP-001" variant="monitor">
            <div className="map-container">
              <CyberMap
                locations={[location]}
                selectedTypes={[]}
                onLocationClick={() => {}}
              />
            </div>
          </Panel>

          {community.contact && (
            <Panel title="CONTACT INFO" systemId="CON-001" variant="secondary">
              <MetaInfo data={{
                ...(community.contact.email && { 'Email': community.contact.email }),
                ...(community.contact.phone && { 'Phone': community.contact.phone }),
                ...(community.contact.social && Object.entries(community.contact.social).reduce((acc, [platform, handle]) => ({
                  ...acc,
                  [platform.charAt(0).toUpperCase() + platform.slice(1)]: handle
                }), {}))
              }} />
            </Panel>
          )}
        </div>
      </div>

      <style jsx>{`
        .org-page {
          padding: 1rem;
        }

        .org-grid {
          display: grid;
          grid-template-columns: 1fr 350px;
          gap: 1rem;
        }

        .main-content {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .side-content {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .map-container {
          height: 300px;
          width: 100%;
        }

        .amenities-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .amenity-tag {
          padding: 0.25rem 0.5rem;
          background: rgba(0, 56, 117, 0.3);
          border: 1px solid var(--terminal-color);
          color: var(--terminal-color);
          font-family: var(--font-mono);
          font-size: 0.8rem;
        }

        .events-list, .communities-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .event-date {
          color: var(--nyc-orange);
          font-size: 0.8rem;
        }

        .event-name {
          color: var(--terminal-color);
          font-size: 1rem;
        }

        .event-type {
          color: var(--terminal-color);
          opacity: 0.7;
          font-size: 0.8rem;
        }

        .community-type {
          color: var(--nyc-orange);
          font-size: 0.8rem;
        }

        .community-name {
          color: var(--terminal-color);
          font-size: 1rem;
        }

        @media (max-width: 1024px) {
          .org-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
} 