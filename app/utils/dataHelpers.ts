import communities from '@/public/data/communities.json';
import locations from '@/public/data/locations.json';
import events from '@/public/data/events.json';
import { Event } from '@/app/types/event';

export interface Community {
  id: string;
  name: string;
  type: string;
  organizationType?: string;
  description: string;
  founded: string;
  size: string | number;
  category: string | string[];
  contact?: {
    email?: string;
    phone?: string;
    social?: {
      [key: string]: string;
    };
  };
  website?: string;
  image?: string;
  tags?: string[];
  membershipType?: string;
  membershipFee?: string | {
    amount: number;
    frequency: string;
  };
}

export interface Location {
  id: string;
  name: string;
  type: string;
  community_and_location?: boolean;
  mainCommunityId?: string;
  address: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  description?: string;
  amenities?: string[];
  capacity?: string;
  accessibility?: boolean;
  website?: string;
  images?: string[];
  hours?: {
    [key: string]: string;
  };
  category?: string | string[];
  tags?: string[];
  contact?: {
    email?: string;
    instagram?: string;
    [key: string]: string | undefined;
  };
}

export function getCommunityData(communityId: string): Community | undefined {
  return communities.communities.find(c => c.id === communityId);
}

export function getLocationData(locationId: string): Location | undefined {
  return locations.locations.find(l => l.id === locationId);
}

/**
 * Get all events associated with a specific community
 */
export function getEventsForCommunity(communityId: string): Event[] {
  return events.events.filter(event => event.communityId === communityId);
}

/**
 * Get all events associated with a specific location
 */
export function getEventsForLocation(locationId: string): Event[] {
  return events.events.filter(event => event.locationId === locationId);
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
  return locations.locations.filter(location => 
    locationIds.includes(location.id)
  );
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