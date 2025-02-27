'use client';
import React from 'react';
import { DetailSection } from '@/app/components/ui/DetailSection';
import { MetaInfo } from '@/app/components/ui/MetaInfo';
import { Panel } from '@/app/components/ui/Panel';
import { CyberLink } from '@/app/components/ui/CyberLink';
import { PageNav } from '@/app/components/ui/PageNav';
import type { Location, Event, Community } from '@/app/types';

interface LocationDetailClientProps {
  location: Location;
  locationEvents: Event[];
  associatedCommunities: Community[];
}

export function LocationDetailClient({ 
  location, 
  locationEvents, 
  associatedCommunities 
}: LocationDetailClientProps) {
  return (
    <main className="page-layout">
      <PageNav 
        title={location.name}
        systemId={`LOC-${location.id}`}
      />

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
              location.amenities.reduce<Record<string, string>>((acc, amenity, index) => ({
                ...acc,
                [`${index + 1}`]: amenity
              }), {})
            } />
          </DetailSection>
        )}

        {location.hours && (
          <DetailSection title="Hours of Operation">
            <MetaInfo data={
              Object.entries(location.hours).reduce<Record<string, string>>((acc, [day, hours]) => ({
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
                <CyberLink key={event.id} href={`/events/${encodeURIComponent(event.id)}`} variant="default">
                  <div className="event-info">
                    <div className="event-header">
                      <span className="event-date">[{new Date(event.startDate).toLocaleDateString()}]</span>
                      <span className="event-name">{event.name}</span>
                    </div>
                    <div className="event-meta">
                      {event.type}
                      {Array.isArray(event.category) && event.category.length > 0 && ` • ${event.category.join(' • ')}`}
                    </div>
                  </div>
                </CyberLink>
              ))}
            </div>
          </DetailSection>
        )}
      </Panel>

      <style jsx>{`
        .page-layout {
          display: flex;
          flex-direction: column;
          height: 100vh;
          overflow: hidden;
        }

        /* All styles have been moved to globals.css */
      `}</style>
    </main>
  );
} 