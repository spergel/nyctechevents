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
}

export interface Event {
  id: string;
  name: string;
  type: string;
  locationId?: string;
  communityId?: string;
  description?: string;
  startDate: string;
  endDate?: string | null;
  category: string | string[];
  metadata?: {
    venue?: {
      name: string;
      address?: string;
      type: string;
    };
  };
}

export interface Community {
  id: string;
  name: string;
  type: string;
  category: string[];
  meetingLocationIds?: string[];
}

export interface PageProps {
  params: { id: string };
  searchParams?: { [key: string]: string | string[] | undefined };
} 