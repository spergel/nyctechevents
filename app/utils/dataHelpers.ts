import communities from '@/public/data/communities.json';
import locations from '@/public/data/locations.json';
import events from '@/public/data/events.json';
import { Event, Community, Location } from '@/app/types';

export type { Location };

// Helper function to ensure location has all required fields
const ensureCompleteLocation = (location: any): Location => ({
  ...location,
  capacity: location.capacity || 'Unknown',
  accessibility: location.accessibility || false,
  hours: location.hours || {},
  contact: location.contact || { phone: '', email: '' }
});

export function getCommunityData(communityId: string | undefined): Community | undefined {
  if (!communityId) return undefined;
  return communities.communities.find(c => c.id === communityId);
}

export function getLocationData(locationId: string | undefined): Location | undefined {
  if (!locationId) return undefined;
  const location = locations.locations.find(l => l.id === locationId);
  return location ? ensureCompleteLocation(location) : undefined;
}

// Add helper function to ensure event has all required fields
const ensureCompleteEvent = (event: any): Event => ({
  ...event,
  category: event.type ? {
    id: event.type,
    name: event.type,
    confidence: 1
  } : undefined,
  price: event.price || {
    amount: 0,
    type: 'Free',
    currency: 'USD',
    details: ''
  },
  capacity: event.capacity || null,
  registrationRequired: event.registrationRequired || false,
  image: event.image || '',
  status: event.status || 'upcoming',
  metadata: event.metadata || {
    source_url: '',
    featured: false
  },
  endDate: event.endDate || event.startDate // Use startDate as endDate if not present
});

/**
 * Get all events associated with a specific community
 */
export function getEventsForCommunity(communityId: string): Event[] {
  return events.events
    .filter(event => event.communityId === communityId)
    .map(event => ensureCompleteEvent(event));
}

/**
 * Get all events associated with a specific location
 */
export function getEventsForLocation(locationId: string): Event[] {
  return events.events
    .filter(event => event.locationId === locationId)
    .map(event => ensureCompleteEvent(event));
}

/**
 * Get communities that have events at this location,
 * excluding the main community
 */
export function getCommunitiesForLocation(locationId: string): Community[] {
  // Find all communities that have events at this location
  const communitiesWithEventsHere = new Set<string>();
  events.events.forEach(event => {
    if (event.locationId === locationId) {
      communitiesWithEventsHere.add(event.communityId);
    }
  });

  // Get the unique list of community IDs
  const communityIds = Array.from(communitiesWithEventsHere);
  
  // Get the location
  const location = getLocationData(locationId);
  let mainCommunityId: string | undefined;
  
  // If location exists, get its main community ID
  if (location) {
    if (location.mainCommunityId) {
      mainCommunityId = location.mainCommunityId;
    } else if (location.community_and_location) {
      // For locations that are also communities, find the community with the same name
      const associatedCommunity = communities.communities.find(c => c.name === location.name);
      if (associatedCommunity) {
        mainCommunityId = associatedCommunity.id;
      }
    }
  }
  
  // Return the full community objects, excluding the main community
  return communities.communities.filter(community => 
    communityIds.includes(community.id) && community.id !== mainCommunityId
  );
}

/**
 * Get locations that are related to a community
 * This includes locations where this community has hosted events
 */
export function getLocationsForCommunity(communityId: string): Location[] {
  // Find all locations where this community has events
  const locationsWithEvents = new Set<string>();
  events.events.forEach(event => {
    if (event.communityId === communityId) {
      locationsWithEvents.add(event.locationId);
    }
  });

  // Get the unique list of location IDs
  const locationIds = Array.from(locationsWithEvents);
  
  // Return the full location objects
  return locations.locations
    .filter(location => locationIds.includes(location.id))
    .map(location => ensureCompleteLocation(location));
}

/**
 * Get the main community for a location
 * If mainCommunityId is set, return that community
 * If community_and_location is true, find the community with the same name
 * Otherwise return undefined
 */
export function getMainCommunityForLocation(location: Location): Community | undefined {
  if (location.mainCommunityId) {
    return getCommunityData(location.mainCommunityId);
  }
  
  // For locations that are also communities (community_and_location)
  if (location.community_and_location) {
    return communities.communities.find(c => c.name === location.name);
  }
  
  return undefined;
}

export function getSocialLink(platform: string, handle: string): string {
  switch (platform.toLowerCase()) {
    case 'instagram':
      return `https://instagram.com/${handle.replace('@', '')}`;
    case 'twitter':
      return `https://twitter.com/${handle.replace('@', '')}`;
    case 'facebook':
      return `https://facebook.com/${handle}`;
    case 'linkedin':
      return `https://linkedin.com/in/${handle}`;
    case 'discord':
      return handle.startsWith('http') ? handle : `https://discord.gg/${handle}`;
    case 'matrix':
      return `https://matrix.to/#/${handle}`;
    case 'website':
      return handle;
    default:
      return handle;
  }
} 