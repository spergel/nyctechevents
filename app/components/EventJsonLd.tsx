'use client';

import { useEffect } from 'react';
import { Event } from '../types/event';

interface EventJsonLdProps {
  event: Event;
}

export default function EventJsonLd({ event }: EventJsonLdProps) {
  useEffect(() => {
    // Only run on client
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    
    // Format the date correctly
    const formatDate = (dateString: string) => {
      try {
        const date = new Date(dateString);
        return date.toISOString();
      } catch (e) {
        return dateString;
      }
    };
    
    const startDate = formatDate(event.startDate);
    const endDate = event.endDate ? formatDate(event.endDate) : startDate;
    
    // Create the JSON-LD data
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Event',
      'name': event.name,
      'description': event.description || '',
      'startDate': startDate,
      'endDate': endDate,
      'location': {
        '@type': 'Place',
        'name': event.metadata?.venue?.name || 'Event Venue',
        'address': {
          '@type': 'PostalAddress',
          'addressLocality': 'New York',
          'addressRegion': 'NY',
          'addressCountry': 'US',
          'streetAddress': event.metadata?.venue?.address || ''
        }
      },
      'image': event.image ? `https://nycevents.vercel.app/${event.image}` : undefined,
      'offers': {
        '@type': 'Offer',
        'price': event.price?.amount || 0,
        'priceCurrency': event.price?.currency || 'USD',
        'availability': 'https://schema.org/InStock',
        'url': event.metadata?.source_url || 'https://nycevents.vercel.app'
      },
      'organizer': {
        '@type': 'Organization',
        'name': event.metadata?.organizer?.name || 'Event Organizer',
        'url': event.metadata?.social_links?.[0] || ''
      }
    };
    
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);
    
    return () => {
      document.head.removeChild(script);
    };
  }, [event]);
  
  return null; // This component doesn't render anything
} 