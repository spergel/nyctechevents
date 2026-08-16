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
  const community = communities.communities.find(c => c.id === communityId);
  if (!community) return undefined;
  
  // Ensure community has all the required fields
  return {
    id: community.id,
    name: community.name,
    type: community.type,
    description: community.description || '',
    founded: community.founded,
    size: community.size,
    category: Array.isArray(community.category) ? community.category : [community.type],
    contact: community.contact,
    website: community.website,
    meetingLocationIds: community.meetingLocationIds,
    image: community.image,
    tags: community.tags,
    membershipType: community.membershipType,
    membershipFee: community.membershipFee
  };
}

/**
 * Resolve the display host for an event.
 * Formal communities.json entries win; otherwise use metadata.derived_community
 * from Luma/ICS (soft host — no /communities/[id] page).
 */
export function getEventHost(event: Event | null | undefined): Community | undefined {
  if (!event) return undefined;
  const formal = getCommunityData(event.communityId);
  if (formal) return formal;

  const derived = event.metadata?.derived_community;
  if (derived?.name) {
    return {
      id: derived.id || event.communityId,
      name: derived.name,
      type: 'Community',
      description: '',
      category: ['Community'],
      website: derived.website,
      image: derived.image,
      derived: true,
    };
  }

  const organizerName = event.metadata?.organizer?.name?.trim();
  if (organizerName && !organizerName.toUpperCase().includes('ORGANIZER')) {
    return {
      id: event.communityId || 'com_derived_unknown',
      name: organizerName,
      type: 'Community',
      description: '',
      category: ['Community'],
      website: event.metadata?.organizer?.website,
      derived: true,
    };
  }

  return undefined;
}

/**
 * Prefer curated locationId; fall back to matching metadata.venue against locations.json.
 */
export function getEventLocation(event: Event | null | undefined): Location | undefined {
  if (!event) return undefined;
  const byId = getLocationData(event.locationId);
  if (byId) return byId;

  const venue = event.metadata?.venue;
  const blob = `${venue?.name || ''} ${venue?.address || ''}`.toLowerCase();
  if (!blob.trim() || blob.startsWith('http')) return undefined;

  const match = locations.locations.find((loc) => {
    const name = (loc.name || '').toLowerCase();
    const address = (loc.address || '').toLowerCase();
    const street = address.split(',')[0]?.trim();
    return (name && blob.includes(name)) || (street && blob.includes(street));
  });
  return match ? ensureCompleteLocation(match) : undefined;
}

export function isFormalCommunity(community: Community | undefined): boolean {
  return Boolean(community && !community.derived && getCommunityData(community.id));
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
 * excluding the main community. Includes soft (derived) hosts.
 */
export function getCommunitiesForLocation(locationId: string): Community[] {
  const location = getLocationData(locationId);
  let mainCommunityId: string | undefined;
  if (location) {
    if (location.mainCommunityId) {
      mainCommunityId = location.mainCommunityId;
    } else if (location.community_and_location) {
      const associatedCommunity = communities.communities.find(c => c.name === location.name);
      if (associatedCommunity) {
        mainCommunityId = associatedCommunity.id;
      }
    }
  }

  const byId = new Map<string, Community>();

    events.events.forEach(event => {
    if (event.locationId !== locationId) return;
    const host = getEventHost(event as unknown as Event);
    if (!host || host.id === mainCommunityId) return;
    if (!byId.has(host.id)) {
      byId.set(host.id, host);
    }
  });

  return Array.from(byId.values());
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
    const community = communities.communities.find(c => c.name === location.name);
    if (community) {
      return getCommunityData(community.id);
    }
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