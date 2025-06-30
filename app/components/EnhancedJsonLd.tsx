'use client';

import Script from 'next/script';
import { useEffect } from 'react';

interface OrganizationJsonLdProps {
  organization: {
    id: string;
    name: string;
    type: string;
    description: string;
    website?: string;
    founded?: string;
    size?: string;
    contact?: {
      email?: string;
      phone?: string;
      social?: {
        twitter?: string;
        instagram?: string;
        linkedin?: string;
        facebook?: string;
      };
    };
    image?: string;
  };
}

interface LocationJsonLdProps {
  location: {
    id: string;
    name: string;
    type: string;
    address: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
    description: string;
    website?: string;
    hours?: Record<string, string>;
    contact?: {
      phone?: string;
      email?: string;
    };
  };
}

interface EventSeriesJsonLdProps {
  events: any[];
  community?: any;
  location?: any;
}

interface WebsiteJsonLdProps {
  url: string;
  name: string;
  description: string;
}

export function OrganizationJsonLd({ organization }: OrganizationJsonLdProps) {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `https://nycevents.vercel.app/communities/${organization.id}`,
      'name': organization.name,
      'description': organization.description,
      'url': organization.website || `https://nycevents.vercel.app/communities/${organization.id}`,
      'foundingDate': organization.founded || undefined,
      'location': {
        '@type': 'Place',
        'name': 'New York City',
        'address': {
          '@type': 'PostalAddress',
          'addressLocality': 'New York',
          'addressRegion': 'NY',
          'addressCountry': 'US'
        }
      },
      'contactPoint': organization.contact?.email ? {
        '@type': 'ContactPoint',
        'email': organization.contact.email,
        'telephone': organization.contact.phone,
        'contactType': 'General'
      } : undefined,
      'sameAs': [
        organization.contact?.social?.twitter ? `https://twitter.com/${organization.contact.social.twitter.replace('@', '')}` : null,
        organization.contact?.social?.instagram ? `https://instagram.com/${organization.contact.social.instagram.replace('@', '')}` : null,
        organization.contact?.social?.linkedin ? `https://linkedin.com/company/${organization.contact.social.linkedin}` : null,
        organization.contact?.social?.facebook ? `https://facebook.com/${organization.contact.social.facebook}` : null,
        organization.website
      ].filter(Boolean),
      'keywords': ['NYC', 'New York', 'community', 'tech', 'events', organization.type, organization.name].join(', '),
      'image': organization.image ? `https://nycevents.vercel.app/${organization.image}` : undefined
    };
    
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);
    
    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [organization]);
  
  return null;
}

export function LocationJsonLd({ location }: LocationJsonLdProps) {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Place',
      '@id': `https://nycevents.vercel.app/locations/${location.id}`,
      'name': location.name,
      'description': location.description,
      'address': {
        '@type': 'PostalAddress',
        'streetAddress': location.address,
        'addressLocality': 'New York',
        'addressRegion': 'NY',
        'addressCountry': 'US'
      },
      'geo': location.coordinates ? {
        '@type': 'GeoCoordinates',
        'latitude': location.coordinates.lat,
        'longitude': location.coordinates.lng
      } : undefined,
      'url': location.website || `https://nycevents.vercel.app/locations/${location.id}`,
      'telephone': location.contact?.phone,
      'email': location.contact?.email,
      'openingHours': location.hours ? Object.entries(location.hours).map(([day, hours]) => 
        `${day.substring(0, 2)} ${hours}`
      ) : undefined,
      'keywords': ['NYC', 'New York', 'venue', 'location', location.type, location.name].join(', ')
    };
    
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);
    
    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [location]);
  
  return null;
}

export function EventSeriesJsonLd({ events, community, location }: EventSeriesJsonLdProps) {
  useEffect(() => {
    if (!events.length) return;
    
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'EventSeries',
      'name': `${community?.name || 'NYC'} Events`,
      'description': `Regular events hosted by ${community?.name || 'the NYC tech community'}`,
      'organizer': community ? {
        '@type': 'Organization',
        'name': community.name,
        'url': community.website || `https://nycevents.vercel.app/communities/${community.id}`
      } : undefined,
      'location': location ? {
        '@type': 'Place',
        'name': location.name,
        'address': {
          '@type': 'PostalAddress',
          'streetAddress': location.address,
          'addressLocality': 'New York',
          'addressRegion': 'NY',
          'addressCountry': 'US'
        }
      } : {
        '@type': 'Place',
        'name': 'New York City',
        'address': {
          '@type': 'PostalAddress',
          'addressLocality': 'New York',
          'addressRegion': 'NY',
          'addressCountry': 'US'
        }
      },
      'subEvent': events.slice(0, 10).map(event => ({
        '@type': 'Event',
        'name': event.name,
        'startDate': event.startDate,
        'endDate': event.endDate || event.startDate,
        'url': `https://nycevents.vercel.app/events/${event.id}`,
        'description': event.description || ''
      }))
    };
    
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);
    
    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [events, community, location]);
  
  return null;
}

export function WebsiteJsonLd({ url, name, description }: WebsiteJsonLdProps) {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': url,
      'name': name,
      'description': description,
      'url': url,
      'potentialAction': {
        '@type': 'SearchAction',
        'target': {
          '@type': 'EntryPoint',
          'urlTemplate': `${url}/events?search={search_term_string}`
        },
        'query-input': 'required name=search_term_string'
      },
      'publisher': {
        '@type': 'Organization',
        'name': 'NYC Events & Communities',
        'url': url
      },
      'keywords': 'NYC events, New York tech, communities, meetups, networking, innovation, startups, cyberpunk',
      'inLanguage': 'en-US',
      'about': [
        {
          '@type': 'Thing',
          'name': 'New York City Events'
        },
        {
          '@type': 'Thing', 
          'name': 'Tech Communities'
        },
        {
          '@type': 'Thing',
          'name': 'Innovation Meetups'
        }
      ]
    };
    
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);
    
    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [url, name, description]);
  
  return null;
} 