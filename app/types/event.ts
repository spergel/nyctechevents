export interface Category {
  id: string;
  name: string;
  confidence: number;
  subcategories?: string[];
}

export interface Event {
  id: string;
  name: string;
  type: string;
  locationId: string;
  communityId: string;
  description: string;
  startDate: string;
  endDate?: string;
  category: string[];
  price: {
    amount: number;
    type: string;
    currency: string;
    details: string;
  };
  capacity: number;
  registrationRequired: boolean;
  tags: string[];
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
    };
    featured: boolean;
    associated_communities?: string[];
  };
  categories: Category[];
  source: string;
} 