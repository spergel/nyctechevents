'use client';
import React, { use } from 'react';
import communities from '@/public/data/communities.json';
import events from '@/public/data/events.json';
import locations from '@/public/data/locations.json';
import { DetailSection } from '@/app/components/ui/DetailSection';
import { MetaInfo } from '@/app/components/ui/MetaInfo';
import { Panel } from '@/app/components/ui/Panel';
import { CyberLink } from '@/app/components/ui/CyberLink';

export default function Community(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const community = communities.communities.find(c => c.id === params.id);
  const communityEvents = events.events.filter(e => e.communityId === params.id)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const communityLocations = community?.meetingLocationIds?.map(locId => 
    locations.locations.find(l => l.id === locId)
  ).filter(Boolean) || [];

  if (!community) {
    return (
      <main>
        <MetaInfo data={{
          'ERROR': `Community with ID "${params.id}" not found in database`,
          'MESSAGE': 'Please check the ID and try again...'
        }} />
      </main>
    );
  }

  return (
    <main>
      
      <Panel title="COMMUNITY DETAILS" systemId="COM-002" variant="secondary">
        <MetaInfo data={{
          'ID': community.id,
          'Type': community.type,
          'Founded': community.founded,
          'Categories': community.category.join(', ')
        }} />

        <DetailSection title="About">
          <p>{community.description}</p>
        </DetailSection>

        {community.website && (
          <DetailSection title="Website">
            <CyberLink href={community.website} variant="source" external>
              {community.website}
            </CyberLink>
          </DetailSection>
        )}

        {community.contact && (
          <DetailSection title="Contact Information">
            <MetaInfo data={{
              'Email': community.contact.email,
              ...Object.entries(community.contact.social || {}).reduce((acc, [platform, handle]) => ({
                ...acc,
                [platform]: handle
              }), {})
            }} />
          </DetailSection>
        )}

        {communityLocations.length > 0 && (
          <DetailSection title="Meeting Locations">
            <div className="locations-grid">
              {communityLocations.map(location => location && (
                <CyberLink key={location.id} href={`/locations/${location.id}`} variant="default">
                  <div className="location-info">
                    <div className="location-header">
                      <span className="location-type">[{location.type}]</span>
                      <span className="location-name">{location.name}</span>
                    </div>
                    <div className="location-address">{location.address}</div>
                  </div>
                </CyberLink>
              ))}
            </div>
          </DetailSection>
        )}

        {communityEvents.length > 0 && (
          <DetailSection title="Upcoming Events">
            <div className="events-grid">
              {communityEvents.map(event => (
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
        /* All styles have been moved to globals.css */
      `}</style>
    </main>
  );
} 