export interface Community {
  id: string;
  name: string;
  type: string;
  description: string;
  website?: string;
  email?: string;
  social?: {
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    facebook?: string;
    discord?: string;
    matrix?: string;
  };
  logo?: string;
  banner?: string;
  category: string[];
  tags: string[];
  metadata: {
    featured: boolean;
    verified: boolean;
    members?: number;
    founded?: string;
    location?: string;
  };
} 