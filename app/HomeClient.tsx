'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import events from '@/public/data/events.json';
import locations from '@/public/data/locations.json';
import { ConsoleLayout } from '@/app/components/ui/ConsoleLayout';
import { CyberLink } from '@/app/components/ui/CyberLink';
import { HolographicDisplay } from '@/app/components/ui/HolographicDisplay';
import Loading from '@/app/loading';
import { Panel } from '@/app/components/ui/Panel';
import { DetailDialog } from '@/app/components/ui/DetailDialog';
import { FilterDialog } from '@/app/components/ui/FilterDialog';
import { FilterToggleButton } from '@/app/components/ui/FilterToggleButton';
import { LocationDetailDialog } from '@/app/components/ui/LocationDetailDialog';
import { EventDetailDialog } from '@/app/components/ui/EventDetailDialog';
import { FeedButtons } from '@/app/components/ui/FeedButtons';
import { Event, Location } from '@/app/types';
import { Event as SimpleEvent } from '@/app/types/index';
import { getCommunityData, getLocationData } from '@/app/utils/dataHelpers';

// Local interface for the events from the JSON file
interface PageEvent {
  id: string;
  name: string;
  startDate: string;
  endDate?: string;
  type: string;
  description?: string;
  locationId?: string;
  communityId?: string;
  image?: string;
  status?: string;
  venue?: {
    name: string;
    address: string;
  };
  metadata?: {
    source_url?: string;
    venue?: {
      name: string;
      address: string;
      type?: string;
    };
    featured?: boolean;
    image_url?: string;
    associated_communities?: string[];
    [key: string]: unknown;
  };
  categories?: string[];
  category?: Event['category'];
  price?: Event['price'];
  capacity?: number | null;
  registrationRequired?: boolean;
}

const DIRECTORY_LINKS = [
  { href: 'https://somethingtodo.nyc', label: 'All Events' },
  { href: '#', label: 'Workout Events (Coming Soon)' },
  { href: 'https://legal.somethingtodo.nyc', label: 'Legal' },
  { href: 'https://youth.somethingtodo.nyc', label: 'Tech for Kids' },
];

// Convert PageEvent to Event type for EventDetailDialog
const convertToEvent = (pageEvent: PageEvent): Event => {
  const venue = pageEvent.venue || pageEvent.metadata?.venue;
  return {
    id: pageEvent.id,
    name: pageEvent.name,
    type: pageEvent.type,
    startDate: pageEvent.startDate,
    endDate: pageEvent.endDate || pageEvent.startDate,
    description: pageEvent.description || '',
    locationId: pageEvent.locationId || '',
    communityId: pageEvent.communityId || '',
    price: pageEvent.price || {
      amount: 0,
      type: 'Free',
      currency: 'USD',
      details: ''
    },
    capacity: pageEvent.capacity ?? null,
    registrationRequired: pageEvent.registrationRequired ?? false,
    image: pageEvent.image || pageEvent.metadata?.image_url || '',
    status: pageEvent.status || 'upcoming',
    metadata: {
      ...(pageEvent.metadata || {}),
      source_url: pageEvent.metadata?.source_url || '',
      venue: venue ? {
        name: venue.name || '',
        address: venue.address || '',
        type: ('type' in venue && venue.type) ? String(venue.type) : 'venue'
      } : undefined,
      featured: pageEvent.metadata?.featured ?? false,
    },
    category: pageEvent.category || (pageEvent.categories ? {
      id: pageEvent.type,
      name: pageEvent.type,
      confidence: 1.0
    } : undefined),
    event_type: pageEvent.type
  };
};

const getEventVenueName = (event: PageEvent): string | undefined => {
  const name = event.venue?.name || event.metadata?.venue?.name;
  return name?.trim() || undefined;
};

const dedupeEvents = (eventList: PageEvent[]): PageEvent[] => {
  const seen = new Map<string, PageEvent>();
  for (const event of eventList) {
    const name = (event.name || '').trim().toLowerCase();
    const day = event.startDate ? event.startDate.slice(0, 10) : event.id;
    const key = `${name}|${day}`;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, event);
      continue;
    }
    const existingScore = (existing.description ? 1 : 0) + (getEventVenueName(existing) ? 1 : 0) + (existing.metadata?.source_url ? 1 : 0);
    const nextScore = (event.description ? 1 : 0) + (getEventVenueName(event) ? 1 : 0) + (event.metadata?.source_url ? 1 : 0);
    if (nextScore > existingScore) {
      seen.set(key, event);
    }
  }
  return Array.from(seen.values());
};

// Helper function to safely create a Date object
const parseSafeDate = (dateStr: string | null): Date | null => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
};

export default function HomeClient() {
  const [isLoading, setIsLoading] = useState(true);
  const [visibleEvents, setVisibleEvents] = useState(10);
  const [isMobile, setIsMobile] = useState(false);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<PageEvent | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('N/A');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const importedTimestamp = (events as { last_updated?: string }).last_updated;

    fetch('/data/last_update.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch last_update.json');
        }
        return response.json();
      })
      .then(data => {
        if (data && data.lastUpdateISO) {
          setLastUpdateTime(data.lastUpdateISO);
        } else if (importedTimestamp) {
          setLastUpdateTime(importedTimestamp);
        }
      })
      .catch(() => {
        setLastUpdateTime(importedTimestamp || new Date().toISOString());
      });

    // Check if the document is already loaded
    if (document.readyState === 'complete') {
      setIsLoading(false);
    } else {
      // Add event listener for when document loads
      const handleLoad = () => {
        setIsLoading(false);
      };
      window.addEventListener('load', handleLoad);
      
      // Cleanup
      return () => window.removeEventListener('load', handleLoad);
    }
  }, []);

  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 1200);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // All upcoming events, with same-day duplicate titles collapsed
  const allUpcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = (events.events as PageEvent[])
      .filter((event) => {
        if (!event.startDate) return false;
        const eventDate = new Date(event.startDate);
        return !isNaN(eventDate.getTime()) && eventDate >= today;
      })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    return dedupeEvents(upcoming);
  }, []);

  // Desktop data feed stays compact (next two days)
  const nearTermEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    return allUpcomingEvents.filter((event) => {
      const eventDate = new Date(event.startDate);
      return eventDate >= today && eventDate < dayAfterTomorrow;
    });
  }, [allUpcomingEvents]);

  const sourceEvents = isMobile ? allUpcomingEvents : nearTermEvents;

  // Filter events based on selected types
  const filteredEvents = useMemo(() => {
    return sourceEvents.filter(event => 
      selectedTypes.length === 0 || selectedTypes.includes(event.type)
    );
  }, [sourceEvents, selectedTypes]);

  // Infinite scroll observer (for desktop and mobile)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleEvents < filteredEvents.length) {
          setVisibleEvents(prev => Math.min(prev + 10, filteredEvents.length));
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [visibleEvents, filteredEvents.length]);

  // Load more function for mobile button
  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    // Simulate loading delay for better UX
    await new Promise(resolve => setTimeout(resolve, 300));
    setVisibleEvents(prev => Math.min(prev + 10, filteredEvents.length));
    setIsLoadingMore(false);
  };

  // Reset visible events when filters or layout change
  useEffect(() => {
    setVisibleEvents(10);
  }, [selectedTypes, isMobile]);

  const handleEventClick = (event: PageEvent) => {
    setSelectedEvent(event);
  };

  const handleLocationClick = (location: Location) => {
    setSelectedLocation(location);
  };

  // Get unique event types with counts
  const eventTypes = useMemo(() => {
    const types = new Map<string, number>();
    if (events?.events) {
      (events.events as unknown as PageEvent[]).forEach((event) => {
        if (event.type) {
          types.set(event.type, (types.get(event.type) || 0) + 1);
        }
      });
    }
    return Array.from(types.entries()).map(([type, count]) => ({
      id: type,
      name: type,
      count
    }));
  }, []);

  // Filter groups for mobile dialog
  const filterGroups = [
    {
      title: 'EVENT TYPES',
      options: eventTypes,
      selectedIds: selectedTypes,
      onToggle: (id: string) => {
        setSelectedTypes(prev => 
          prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
        );
      }
    }
  ];

  // For the LocationDetailDialog which expects a SimpleEvent
  const handleAppEventSelect = (event: SimpleEvent) => {
    // Convert SimpleEvent to PageEvent for the EventDetailDialog
    const pageEvent: PageEvent = {
      id: event.id,
      name: event.name,
      startDate: event.startDate,
      type: event.type,
      description: event.description,
      venue: event.metadata?.venue ? {
        name: event.metadata.venue.name,
        address: event.metadata.venue.address || ''
      } : undefined,
      categories: Array.isArray(event.category) ? event.category : [event.type]
    };
    setSelectedEvent(pageEvent);
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="console-page">

      {/* Mobile Filter Toggle */}
      {isMobile && (
        <FilterToggleButton 
          isActive={isFilterDialogOpen}
          onClick={() => setIsFilterDialogOpen(!isFilterDialogOpen)}
          resultCount={filteredEvents.length}
        />
      )}

      {/* Mobile Filter Dialog */}
      {isMobile && (
        <FilterDialog
          title="EVENT FILTERS"
          systemId="EVT-FIL-001"
          isOpen={isFilterDialogOpen}
          onClose={() => setIsFilterDialogOpen(false)}
          onApply={() => setIsFilterDialogOpen(false)}
          filterGroups={filterGroups}
          resultCount={filteredEvents.length}
          onClearAll={() => setSelectedTypes([])}
        />
      )}

      {/* Mobile Events List - Using Event Cards */}
      {isMobile && (
        <Panel 
          title={`NYC EVENTS (${filteredEvents.length})`}
          systemId="DATA-003" 
          variant="secondary"
        >
          <div className="event-cards">
            {filteredEvents.slice(0, visibleEvents).map((event) => {
              const eventDate = parseSafeDate(event.startDate);
              const venueName = getEventVenueName(event);
              
              if (!eventDate) return null;
              
              return (
                <div 
                  key={event.id}
                  className="event-card" 
                  onClick={() => handleEventClick(event)}
                >
                  {/* Date Badge */}
                  <div className="event-date">
                    <div className="date-month">{eventDate.toLocaleString('en-US', { month: 'short' }).toUpperCase()}</div>
                    <div className="date-day">{eventDate.getDate()}</div>
                  </div>
                  
                  {/* Event Content */}
                  <div className="event-content">
                    <h3 className="event-name">{event.name}</h3>
                    <div className="event-time">{eventDate.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })}</div>
                    
                    <div className="event-details">
                      {venueName && (
                        <div className="detail-row">
                          <span className="detail-icon">◎</span>
                          <span className="detail-text">{venueName}</span>
                        </div>
                      )}
                      
                      {event.type && (
                        <div className="detail-row">
                          <span className="detail-icon">⚡</span>
                          <span className="detail-text">{event.type}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {filteredEvents.length === 0 && (
              <div className="no-data">No events match your filters</div>
            )}
            
            {/* Load More Button */}
            {visibleEvents < filteredEvents.length && (
              <div className="load-more-container">
                <button 
                  className="load-more-button"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? 'LOADING...' : `LOAD MORE (${filteredEvents.length - visibleEvents} remaining)`}
                </button>
              </div>
            )}
            
            {/* Infinite scroll trigger (hidden) */}
            {visibleEvents < filteredEvents.length && (
              <div ref={observerTarget} className="infinite-scroll-trigger" />
            )}
          </div>
        </Panel>
      )}

      {/* Desktop Layout */}
      {!isMobile && (
        <ConsoleLayout
          locations={(locations?.locations || []) as unknown as Location[]}
          onLocationClick={handleLocationClick}
          lastUpdateTime={lastUpdateTime}
          eventCount={filteredEvents.length}
          linkCount={DIRECTORY_LINKS.length}
        >
          <Panel 
            systemId="NYC-001" 
            variant="monitor"
          >
            <HolographicDisplay>
              <img src="/nyc_skyline.gif" alt="NYC Skyline" className="skyline-display" />
            </HolographicDisplay>
          </Panel>

          <Panel 
            systemId="DIR-001"
            variant="primary"
          >
            <div className="directory-links">
              {DIRECTORY_LINKS.map(link => (
                <CyberLink key={link.href + link.label} href={link.href} variant="directory">
                  {link.label}
                </CyberLink>
              ))}
            </div>
          </Panel>

          <Panel 
            systemId="DATA-003" 
            variant="secondary"
          >
            <div className="data-feed">
              {filteredEvents.slice(0, visibleEvents).map(event => (
                <a
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="data-event"
                  onClick={(e) => {
                    e.preventDefault();
                    handleEventClick(event);
                  }}
                >
                  <span className="event-date">{new Date(event.startDate).toLocaleDateString()}</span>
                  <span className="event-name">{event.name}</span>
                </a>
              ))}
              {filteredEvents.length === 0 && (
                <div className="no-data">No events match your filters</div>
              )}
              {visibleEvents < filteredEvents.length && (
                <div ref={observerTarget} className="loading-trigger">
                  <a href="/events" className="go-to-events-link">Go to events</a>
                </div>
              )}
            </div>
          </Panel>
        </ConsoleLayout>
      )}

      {/* Event Detail Dialog */}
      {selectedEvent && (
        <EventDetailDialog
          event={convertToEvent(selectedEvent)}
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onLocationClick={(locationId) => {
            const location = locations?.locations.find(loc => loc.id === locationId);
            if (location) {
              handleLocationClick(location as Location);
            }
          }}
        />
      )}

      {/* Location Detail Dialog */}
      <LocationDetailDialog
        location={selectedLocation}
        isOpen={!!selectedLocation}
        onClose={() => setSelectedLocation(null)}
        onEventSelect={handleAppEventSelect}
      />

      <style jsx>{`
        .console-page {
          width: 100%;
          height: 100%;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .page-header {
          padding: 1rem;
          background: rgba(0, 20, 40, 0.3);
          border-bottom: 1px solid var(--nyc-orange);
        }

        .back-button {
          background: rgba(0, 56, 117, 0.3);
          border: 1px solid var(--terminal-color);
          color: var(--terminal-color);
          font-family: var(--font-mono);
          padding: 0.5rem 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.9rem;
        }

        .back-button:hover {
          background: rgba(0, 56, 117, 0.5);
          border-color: var(--nyc-orange);
          color: var(--nyc-orange);
        }

        .data-feed, .info-feed {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 0.5rem;
          max-height: 100%;
          overflow-y: auto;
        }

        .no-data {
          color: var(--terminal-color);
          font-family: var(--font-mono);
          font-size: 0.9rem;
          text-align: center;
          padding: 1rem;
          opacity: 0.7;
        }

        .loading-trigger {
          padding: 1rem;
          text-align: center;
          color: var(--terminal-color);
          font-family: var(--font-mono);
          font-size: 0.8rem;
          opacity: 0.7;
        }

        /* Event Cards Styles (same as events page) */
        .event-cards {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
          width: 100%;
          padding: 1rem;
        }

        .event-card {
          position: relative;
          display: flex;
          border: 1px solid var(--terminal-color);
          background: rgba(0, 23, 57, 0.7);
          cursor: pointer;
          overflow: hidden;
          transition: border-color 0.2s ease;
        }

        .event-card:hover {
          border-color: var(--nyc-orange);
        }

        .event-card .event-date {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 0.75rem;
          background: rgba(0, 20, 40, 0.5);
          min-width: 60px;
          text-align: center;
        }

        .date-month {
          color: var(--nyc-orange);
          font-size: 0.8rem;
          letter-spacing: 1px;
          font-family: var(--font-mono);
        }

        .date-day {
          font-size: 1.5rem;
          font-weight: bold;
          color: var(--nyc-white);
          line-height: 1;
        }

        .event-content {
          flex: 1;
          padding: 0.75rem;
          display: flex;
          flex-direction: column;
        }

        .event-card .event-name {
          color: var(--nyc-white);
          margin: 0 0 0.5rem 0;
          font-size: 1rem;
          line-height: 1.3;
        }

        .data-event .event-date {
          color: var(--terminal-color);
          font-size: 0.8rem;
          white-space: nowrap;
        }

        .data-event .event-name {
          color: var(--nyc-white);
          font-size: 0.9rem;
        }

        .event-time {
          font-family: var(--font-mono);
          color: var(--terminal-color);
          font-size: 0.85rem;
          margin-bottom: 0.75rem;
        }

        .event-details {
          margin-top: auto;
        }

        .detail-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.35rem;
        }

        .detail-icon {
          color: var(--nyc-orange);
          font-size: 0.9rem;
        }

        .detail-text {
          color: var(--nyc-white);
          font-size: 0.9rem;
        }

        .featured-badge {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          background: var(--nyc-orange);
          color: var(--nyc-blue);
          font-family: var(--font-mono);
          font-size: 0.7rem;
          padding: 0.25rem 0.5rem;
          clip-path: polygon(0 0, 100% 0, 95% 100%, 0 100%);
        }

        /* Detail Dialog Styles */
        .event-detail,
        .location-detail {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .detail-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--terminal-color);
        }

        .detail-date,
        .detail-type,
        .detail-capacity {
          font-family: var(--font-mono);
          font-size: 0.9rem;
          color: var(--nyc-orange);
          padding: 0.25rem 0.5rem;
          background: rgba(0, 56, 117, 0.3);
          border: 1px solid var(--terminal-color);
        }

        .detail-description {
          color: var(--nyc-white);
          line-height: 1.6;
          font-size: 0.95rem;
        }

        .detail-venue,
        .detail-categories,
        .detail-amenities,
        .detail-hours {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        h4 {
          color: var(--terminal-color);
          font-family: var(--font-mono);
          font-size: 0.8rem;
          margin: 0;
          text-transform: uppercase;
        }

        .venue-name {
          color: var(--nyc-white);
          font-size: 1.1rem;
          font-weight: bold;
        }

        .venue-address {
          color: var(--nyc-white);
          opacity: 0.8;
        }

        .categories-list,
        .amenities-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .category-tag,
        .amenity-tag {
          font-size: 0.8rem;
          padding: 0.25rem 0.5rem;
          background: rgba(0, 255, 255, 0.1);
          border: 1px solid var(--terminal-color);
          color: var(--terminal-color);
        }

        .hours-list {
          display: grid;
          gap: 0.5rem;
        }

        .hours-item {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem;
          background: rgba(0, 56, 117, 0.3);
          border: 1px solid var(--terminal-color);
        }

        .day {
          color: var(--terminal-color);
          text-transform: uppercase;
          font-size: 0.8rem;
        }

        .hours {
          color: var(--nyc-white);
          font-size: 0.8rem;
        }

        .go-to-events-link {
          color: var(--orange);
          text-decoration: none;
          font-weight: 500;
          display: block;
          text-align: center;
          padding: 8px;
          transition: color 0.2s;
        }

        .go-to-events-link:hover {
          color: var(--orange-hover);
          text-decoration: underline;
        }

        @media (max-width: 1200px) {
          .console-page {
            height: auto;
            min-height: 100%;
            overflow: visible;
            padding-bottom: 4.5rem;
          }

          .console-page :global(.panel) {
            height: auto;
            min-height: calc(100vh - 5rem);
          }
        }

        @media (max-width: 768px) {
          .console-page {
            padding-bottom: 4.5rem;
          }

          .page-header {
            display: none;
          }

          .event-cards {
            grid-template-columns: 1fr;
            padding: 0.75rem;
          }

          .data-feed {
            padding: 0.75rem;
          }

          .data-event {
            padding: 0.75rem;
            background: rgba(0, 56, 117, 0.3);
            border: 1px solid var(--nyc-orange);
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            text-decoration: none;
            transition: all 0.2s ease;
          }

          .data-event .event-date {
            color: var(--terminal-color);
            font-size: 0.8rem;
          }

          .data-event .event-name {
            color: var(--nyc-white);
            font-size: 1rem;
            font-weight: bold;
          }
        }

        .directory-links {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .feed-buttons-container {
          margin-top: 0.5rem;
          padding-top: 0.5rem;
          border-top: 1px solid rgba(0, 56, 117, 0.3);
        }

        /* Load More Button Styles */
        .load-more-container {
          display: flex;
          justify-content: center;
          padding: 1.5rem;
          grid-column: 1 / -1;
        }

        .load-more-button {
          background: rgba(0, 56, 117, 0.3);
          border: 1px solid var(--terminal-color);
          color: var(--terminal-color);
          font-family: var(--font-mono);
          font-size: 0.9rem;
          padding: 0.75rem 1.5rem;
          cursor: pointer;
          transition: all 0.2s ease;
          min-width: 200px;
          text-align: center;
        }

        .load-more-button:hover:not(:disabled) {
          background: rgba(0, 56, 117, 0.5);
          border-color: var(--nyc-orange);
          color: var(--nyc-orange);
        }

        .load-more-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Infinite Scroll Trigger */
        .infinite-scroll-trigger {
          height: 1px;
          opacity: 0;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
} 