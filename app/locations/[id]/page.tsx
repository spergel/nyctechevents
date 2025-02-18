'use client';
import React, { use } from 'react';
import locations from '../../../data/locations.json';
import events from '../../../data/events.json';
import communities from '../../../data/communities.json';
import { DetailSection } from '../../components/ui/DetailSection';
import { MetaInfo } from '../../components/ui/MetaInfo';
import { Panel } from '../../components/ui/Panel';
import { CyberLink } from '../../components/ui/CyberLink';

interface Community {
  id: string;
  name: string;
  type: string;
  category: string[];
  meetingLocationIds?: string[];
}

export default function Location(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const location = locations.locations.find(l => l.id === params.id);
  const locationEvents = events.events.filter(e => 
    e.metadata?.venue?.name === location?.name || 
    e.locationId === params.id
  ).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const associatedCommunities = (communities.communities as Community[]).filter(c => 
    c.meetingLocationIds?.includes(params.id)
  );

  if (!location) {
    return (
      <main>
        
        <MetaInfo data={{
          'ERROR': `Location with ID "${params.id}" not found in database`,
          'MESSAGE': 'Please check the ID and try again...'
        }} />
      </main>
    );
  }

  return (
    <main>
     
      <Panel title="LOCATION DETAILS" systemId="LOC-002" variant="secondary">
        <MetaInfo data={{
          'ID': location.id,
          'Type': location.type,
          'Address': location.address,
          'Capacity': location.capacity.toString(),
          'Accessibility': location.accessibility ? 'Yes' : 'No'
        }} />

        <DetailSection title="About">
          <p>{location.description}</p>
        </DetailSection>

        {location.website && (
          <DetailSection title="Website">
            <CyberLink href={location.website} variant="source" external>
              {location.website}
            </CyberLink>
          </DetailSection>
        )}

        {location.amenities && location.amenities.length > 0 && (
          <DetailSection title="Amenities">
            <MetaInfo data={
              location.amenities.reduce((acc, amenity, index) => ({
                ...acc,
                [`${index + 1}`]: amenity
              }), {})
            } />
          </DetailSection>
        )}

        {location.hours && (
          <DetailSection title="Hours of Operation">
            <MetaInfo data={
              Object.entries(location.hours).reduce((acc, [day, hours]) => ({
                ...acc,
                [day.charAt(0).toUpperCase() + day.slice(1)]: hours
              }), {})
            } />
          </DetailSection>
        )}

        {location.contact && (
          <DetailSection title="Contact Information">
            <MetaInfo data={{
              'Phone': location.contact.phone,
              'Email': location.contact.email
            }} />
          </DetailSection>
        )}

        {associatedCommunities.length > 0 && (
          <DetailSection title="Associated Communities">
            <div className="communities-grid">
              {associatedCommunities.map(community => (
                <CyberLink key={community.id} href={`/communities/${community.id}`} variant="default">
                  <div className="community-info">
                    <div className="community-header">
                      <span className="community-type">[{community.type}]</span>
                      <span className="community-name">{community.name}</span>
                    </div>
                    <div className="community-categories">
                      {community.category.join(' • ')}
                    </div>
                  </div>
                </CyberLink>
              ))}
            </div>
          </DetailSection>
        )}

        {locationEvents.length > 0 && (
          <DetailSection title="Events at this Location">
            <div className="events-grid">
              {locationEvents.map(event => (
                <CyberLink key={event.id} href={`/events/${event.id}`} variant="default">
                  <div className="event-info">
                    <div className="event-header">
                      <span className="event-date">[{new Date(event.startDate).toLocaleDateString()}]</span>
                      <span className="event-name">{event.name}</span>
                    </div>
                    <div className="event-meta">
                      {event.type}
                      {event.category?.length > 0 && ` • ${event.category.join(' • ')}`}
                    </div>
                  </div>
                </CyberLink>
              ))}
            </div>
          </DetailSection>
        )}
      </Panel>

      <style jsx>{`
        .detail-page {
          width: 100%;
          min-height: 100%;
        }

        p {
          color: var(--nyc-white);
          line-height: 1.6;
          margin-bottom: 1rem;
        }

        .communities-grid, .events-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }

        .community-info, .event-info {
          padding: 0.5rem;
        }

        .community-header, .event-header {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
        }

        .community-type, .event-date {
          color: var(--terminal-color);
          font-family: var(--font-mono);
          font-size: 0.9rem;
        }

        .community-name, .event-name {
          color: var(--nyc-white);
          font-family: var(--font-display);
        }

        .community-categories, .event-meta {
          color: var(--nyc-orange);
          font-size: 0.9rem;
          opacity: 0.8;
        }

        @media (max-width: 768px) {
          .detail-page {
            padding: 0;
          }

          p {
            font-size: 0.95rem;
          }

          .communities-grid, .events-grid {
            grid-template-columns: 1fr;
          }

          .community-info, .event-info {
            padding: 0.75rem;
          }

          .community-header, .event-header {
            flex-direction: column;
            gap: 0.25rem;
          }
        }

        @media (max-width: 480px) {
          p {
            font-size: 0.9rem;
          }

          .community-type, .event-date,
          .community-categories, .event-meta {
            font-size: 0.8rem;
          }

          .community-name, .event-name {
            font-size: 0.95rem;
          }
        }
      `}</style>
    </main>
  );
} 