export interface Location {
  id: string;
  name: string;
  type: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  description: string;
  amenities: string[];
  capacity: string | number;
  accessibility: boolean;
  website: string;
  hours?: Record<string, string>;
  contact?: {
    phone: string;
    email: string;
  };
  community_and_location?: string;
  mainCommunityId?: string;
  category?: string;
  tags?: string[];
  images?: string[];
}

export interface Category {
  id: string;
  name: string;
  confidence: number;
}

export interface Event {
  id: string;
  name: string;
  type: string;
  locationId: string;
  communityId: string;
  description: string;
  startDate: string;
  endDate: string;
  price: {
    amount: number;
    type: string;
    currency: string;
    details: string;
  };
  capacity: number | null;
  registrationRequired: boolean;
  image: string;
  status: string;
  metadata: {
    source_url: string;
    speakers?: {
      name: string;
      bio?: string;
      title?: string;
      image?: string;
    }[];
    venue?: {
      name: string;
      address: string;
      type: string;
    };
    organizer?: {
      name: string;
      description?: string;
      website?: string;
      email?: string;
      instagram?: string;
    };
    featured: boolean;
    associated_communities?: string[];
    social_links?: string[];
  };
  category?: Category;
  event_type?: string;
}

export interface Community {
  id: string;
  name: string;
  type: string;
  description: string;
  founded?: string;
  size?: string;
  category: string[];
  contact?: {
    email?: string;
    phone?: string;
    social?: {
      twitter?: string;
      instagram?: string;
      linkedin?: string;
      facebook?: string;
      discord?: string;
      matrix?: string;
    };
  };
  website?: string;
  meetingLocationIds?: string[];
  image?: string;
  tags?: string[];
  membershipType?: string;
  membershipFee?: string | {
    amount?: number;
    frequency?: string;
    details?: string;
  };
  metadata?: {
    featured?: boolean;
    verified?: boolean;
    members?: number;
    founded?: string;
    location?: string;
  };
}

export interface PageProps {
  params: { id: string };
  searchParams?: { [key: string]: string | string[] | undefined };
} 