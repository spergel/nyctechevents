// @ts-nocheck
import React from 'react';
import locations from '@/public/data/locations.json';
import events from '@/public/data/events.json';
import communities from '@/public/data/communities.json';
import { LocationDetailClient } from './LocationDetailClient';
import type { Location, Event, Community } from '@/app/types';

type Props = {
  params: Promise<{ id: string }>;
}

export default async function LocationDetailPage({ params }: Props) {
  // Await the params to get the id
  const { id } = await params;
  
  const location = locations.locations.find(l => l.id === id) as Location;
  const locationEvents = events.events.filter(e => 
    e.metadata?.venue?.name === location?.name || 
    e.locationId === id
  ).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()) as Event[];

  const associatedCommunities = (communities as { communities: Community[] }).communities.filter(c => 
    c.meetingLocationIds?.includes(id)
  );

  if (!location) {
    return null;
  }

  return (
    <LocationDetailClient 
      location={location}
      locationEvents={locationEvents}
      associatedCommunities={associatedCommunities}
    />
  );
} 