'use client';
import React, { use } from 'react';
import events from '@/public/data/events.json';
import communities from '@/public/data/communities.json';
import { DetailSection } from '@/app/components/ui/DetailSection';
import { MetaInfo } from '@/app/components/ui/MetaInfo';
import { Panel } from '@/app/components/ui/Panel';
import { CyberLink } from '@/app/components/ui/CyberLink';

// Function to clean description text
const cleanDescription = (text: string | undefined | null): string => {
  if (!text) return '';
  
  // Remove emoji sequences (both Unicode and shortcode formats)
  return text
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]/g, '')  // Remove Unicode emojis using surrogate pairs
    .replace(/:[a-zA-Z0-9_+-]+:/g, '')  // Remove emoji shortcodes like :smile:
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .trim();
};

export default function Event(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  // Decode the URL parameter to handle special characters
  const decodedId = decodeURIComponent(params.id);
  const event = events.events.find(e => e.id === decodedId);
  const community = event?.communityId ? 
    communities.communities.find(c => c.id === event.communityId) : null;

  if (!event) {
    return (
      <main>
       
        <MetaInfo data={{
          'ERROR': `Event with ID "${decodedId}" not found in database`,
          'MESSAGE': 'Please check the ID and try again...'
        }} />
      </main>
    );
  }

  return (
    <main>

      
      <Panel title="EVENT DETAILS" systemId="EVT-002" variant="secondary">
        <MetaInfo data={{
          'ID': event.id,
          'Type': event.type,
          'Date': new Date(event.startDate).toLocaleString(),
          'End Date': event.endDate ? new Date(event.endDate).toLocaleString() : undefined,
          'Categories': event.category && Array.isArray(event.category) ? event.category.join(', ') : 'N/A',
          'Status': event.status
        }} />

        <DetailSection title="About">
          <p dangerouslySetInnerHTML={{ __html: cleanDescription(event.description)?.replace(/\n/g, '<br />') }} />
        </DetailSection>

        {community && (
          <DetailSection title="Organized by">
            <CyberLink href={`/communities/${community.id}`} variant="community">
              {community.name}
            </CyberLink>
          </DetailSection>
        )}

        {event.metadata?.venue && (
          <DetailSection title="Venue">
            <MetaInfo data={{
              'Name': event.metadata.venue.name,
              'Type': event.metadata.venue.type,
              'Address': event.metadata.venue.address
            }} />
          </DetailSection>
        )}

        {event.metadata?.organizer && (
          <DetailSection title="Contact">
            <MetaInfo data={{
              'Name': event.metadata.organizer.name,
              'Email': event.metadata.organizer.email,
              'Instagram': event.metadata.organizer.instagram ? `@${event.metadata.organizer.instagram}` : undefined
            }} />
          </DetailSection>
        )}

        {event.metadata?.source_url && (
          <DetailSection title="Source">
            <CyberLink href={event.metadata.source_url} variant="source" external>
              {event.metadata.source_url}
            </CyberLink>
          </DetailSection>
        )}
      </Panel>

      <style jsx>{`
        /* All styles have been moved to globals.css */
      `}</style>
    </main>
  );
} 