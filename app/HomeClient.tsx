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

// Local interface for the events from the JSON file
interface PageEvent {
  id: string;
  name: string;
  startDate: string;
  type: string;
  description?: string;
  venue?: {
    name: string;
    address: string;
  };
  categories?: string[];
}

// Convert PageEvent to Event type for EventDetailDialog
const convertToEvent = (pageEvent: PageEvent): Event => {
  return {
    id: pageEvent.id,
    name: pageEvent.name,
    type: pageEvent.type,
    startDate: pageEvent.startDate,
    endDate: pageEvent.startDate, // Use same date for end if not provided
    description: pageEvent.description || '',
    locationId: '',
    communityId: '',
    price: {
      amount: 0,
      type: 'Free',
      currency: 'USD',
      details: ''
    },
    capacity: null,
    registrationRequired: false,
    image: '',
    status: 'upcoming',
    metadata: {
      source_url: '',
      venue: pageEvent.venue ? {
        ...pageEvent.venue,
        type: 'venue'
      } : undefined,
      featured: false
    },
    category: pageEvent.categories ? {
      id: pageEvent.type,
      name: pageEvent.type,
      confidence: 1.0
    } : undefined,
    event_type: pageEvent.type
  };
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
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch last update time
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
        }
      })
      .catch(error => {
        console.error('Error fetching or parsing last_update.json:', error);
        setLastUpdateTime('Error'); // Indicate an error in the UI if needed
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
      setIsMobile(window.innerWidth <= 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Get all upcoming events
  const upcomingEvents = useMemo(() => {
    return [...((events?.events || []) as unknown as PageEvent[])]
      .filter(event => new Date(event.startDate) > new Date())
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, []);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleEvents < upcomingEvents.length) {
          setVisibleEvents(prev => Math.min(prev + 10, upcomingEvents.length));
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [visibleEvents, upcomingEvents.length]);

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

  // Filter events based on selected types
  const filteredEvents = useMemo(() => {
    return upcomingEvents.filter(event => 
      selectedTypes.length === 0 || selectedTypes.includes(event.type)
    );
  }, [upcomingEvents, selectedTypes]);

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
          filterGroups={filterGroups}
          resultCount={filteredEvents.length}
          onClearAll={() => setSelectedTypes([])}
        />
      )}

      {/* Mobile Events List */}
      {isMobile && (
        <Panel 
          systemId="DATA-003" 
          variant="secondary"
        >
          <div className="data-feed">
            {filteredEvents.map(event => (
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
          </div>
        </Panel>
      )}

      {/* Desktop Layout */}
      {!isMobile && (
        <ConsoleLayout
          locations={(locations?.locations || []) as unknown as Location[]}
          onLocationClick={handleLocationClick}
          lastUpdateTime={lastUpdateTime}
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
              <CyberLink href="https://somethingtodo.nyc" variant="directory">All Events</CyberLink>
              <CyberLink href="#" variant="directory">Workout Events (Coming Soon)</CyberLink>
              <FeedButtons className="feed-buttons-container" />
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

        @media (max-width: 768px) {
          .console-page {
            padding-bottom: 0;
          }

          .page-header {
            display: none;
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

          .event-date {
            color: var(--terminal-color);
            font-size: 0.8rem;
          }

          .event-name {
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
      `}</style>
    </div>
  );
} 