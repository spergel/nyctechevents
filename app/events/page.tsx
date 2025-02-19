'use client';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import events from '@/public/data/events.json';
import { Panel } from '@/app/components/ui/Panel';
import Loading from '@/app/loading';
import { FilterButton } from '@/app/components/ui/FilterButton';

interface Category {
  name: string;
  id: string;
  confidence: number;
  subcategories: string[];
}

interface Event {
  id: string;
  name: string;
  type: string;
  startDate: string;
  categories: Category[];
  description?: string;
  venue?: {
    name: string;
    address: string;
    type: string;
  };
  organizer?: {
    name: string;
    instagram?: string;
    email?: string;
  };
}

// Time of day ranges
const timeRanges = {
  morning: { 
    start: 5, 
    end: 11,
    label: 'Morning (5:00 AM - 11:59 AM)'
  },
  afternoon: { 
    start: 12, 
    end: 16,
    label: 'Afternoon (12:00 PM - 4:59 PM)'
  },
  evening: { 
    start: 17, 
    end: 4, // Extends to early morning
    label: 'Evening & Night (5:00 PM - 12:30 AM)'
  }
};

// Date range options
const dateRanges = [
  { id: 'all', name: 'All Dates' },
  { id: 'today', name: 'Today' },
  { id: 'week', name: 'This Week' },
  { id: 'month', name: 'This Month' }
];

// Function to get time of day
const getTimeOfDay = (date: Date): string => {
  const hour = date.getHours();
  if (hour >= timeRanges.morning.start && hour < timeRanges.morning.end) return 'morning';
  if (hour >= timeRanges.afternoon.start && hour < timeRanges.afternoon.end) return 'afternoon';
  // Evening now includes night hours
  if ((hour >= timeRanges.evening.start) || (hour < timeRanges.evening.end)) return 'evening';
  return 'evening'; // Default to evening for any edge cases
};

// Function to normalize text for searching
const normalizeText = (text: string): string => {
  return text?.toLowerCase().trim() || '';
};
  
// Function to check if an event matches the search query
const eventMatchesSearch = (event: Event, searchQuery: string): boolean => {
  if (!searchQuery.trim()) return true;
  
  const normalizedQuery = normalizeText(searchQuery);
  const searchTerms = normalizedQuery.split(/\s+/).filter(term => term.length >= 2);
  
  if (searchTerms.length === 0) return true;

  const eventText = normalizeText([
    event.name,
    event.type,
    event.description,
    event.venue?.name,
    event.venue?.address,
    event.organizer?.name,
    event.categories?.map(cat => cat.name).join(' '),
    event.categories?.flatMap(cat => cat.subcategories || []).join(' ')
  ].filter(Boolean).join(' '));

  // All search terms must be present for a match
  return searchTerms.every(term => eventText.includes(term));
};

export default function Events() {
  // Core states
  const [isLoading, setIsLoading] = useState(true);
  const [isFilteringLoading, setIsFilteringLoading] = useState(false);
  const [displayedEvents, setDisplayedEvents] = useState<Event[]>([]);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Filter states
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const eventsGridRef = useRef<HTMLDivElement>(null);
  const EVENTS_PER_PAGE = 50;

  // Memoized base events that are current or future
  const baseEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return events.events.filter(event => {
      const eventDate = new Date(event.startDate);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate >= today;
    });
  }, []);

  // Memoized filtered and sorted events
  const filteredEvents = useMemo(() => {
    setIsFilteringLoading(true);
    
    try {
      let result = [...baseEvents];

      // Apply search filter
      if (searchQuery.trim()) {
        result = result.filter(event => eventMatchesSearch(event, searchQuery));
      }

      // Apply time of day filter
      if (selectedTimes.length > 0) {
        result = result.filter(event => {
          const eventTime = getTimeOfDay(new Date(event.startDate));
          return selectedTimes.includes(eventTime);
        });
      }

      // Apply date range filter
      if (dateRange !== 'all') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        result = result.filter(event => {
          const eventDate = new Date(event.startDate);
          eventDate.setHours(0, 0, 0, 0);

          switch (dateRange) {
            case 'today':
              return eventDate.getTime() === today.getTime();
            case 'week': {
              const weekFromNow = new Date(today);
              weekFromNow.setDate(today.getDate() + 7);
              return eventDate >= today && eventDate <= weekFromNow;
            }
            case 'month': {
              const monthFromNow = new Date(today);
              monthFromNow.setMonth(today.getMonth() + 1);
              return eventDate >= today && eventDate <= monthFromNow;
            }
            default:
              return true;
          }
        });
      }

      // Apply category filter
      if (selectedCategories.length > 0) {
        result = result.filter(event =>
          event.categories?.some((cat: Category) => selectedCategories.includes(cat.id))
        );
      }

      // Sort by date
        result.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

      return result;
    } finally {
      setIsFilteringLoading(false);
    }
  }, [baseEvents, searchQuery, selectedTimes, dateRange, selectedCategories]);

  // Effect to handle pagination
  useEffect(() => {
    const start = 0;
    const end = page * EVENTS_PER_PAGE;
    setDisplayedEvents(filteredEvents.slice(start, end));
    setIsLoadingMore(false);
  }, [page, filteredEvents]);

  // Reset pagination when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedCategories, selectedTimes, dateRange]);

  // Function to handle infinite scroll
  const handleScroll = useCallback(() => {
    if (!eventsGridRef.current || isLoadingMore) return;

    const grid = eventsGridRef.current;
    const buffer = 100; // pixels from bottom to trigger load
    
    if (grid.scrollHeight - grid.scrollTop - grid.clientHeight < buffer) {
      if (displayedEvents.length < filteredEvents.length) {
        setIsLoadingMore(true);
        setPage(prev => prev + 1);
      }
    }
  }, [displayedEvents.length, filteredEvents.length, isLoadingMore]);

  // Add scroll event listener
  useEffect(() => {
    const grid = eventsGridRef.current;
    if (!grid) return;

    grid.addEventListener('scroll', handleScroll);
    return () => grid.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    if (document.readyState === 'complete') {
      setIsLoading(false);
    } else {
      const handleLoad = () => {
        setIsLoading(false);
      };
      window.addEventListener('load', handleLoad);
      return () => window.removeEventListener('load', handleLoad);
    }
  }, []);

  // Get unique categories from the filtered events
  const allCategories = Array.from(new Set(
    filteredEvents.flatMap(event => 
      event.categories?.map((cat: Category) => cat.id) || []
    )
  ));

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) ? prev.filter(c => c !== categoryId) : [...prev, categoryId]
    );
  };

  const toggleTime = (timeId: string) => {
    setSelectedTimes(prev =>
      prev.includes(timeId) ? prev.filter(t => t !== timeId) : [...prev, timeId]
    );
  };

  const loadMore = () => {
    setPage(prev => prev + 1);
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <main className="events-page">
      <div className="events-layout">
        <div className="main-section">
          <Panel title="NYC EVENTS DIRECTORY" systemId="EVT-001">
            <div className="events-grid" ref={eventsGridRef}>
              {isFilteringLoading ? (
                <div className="filtering-loading">
                  <div className="loading-spinner"></div>
                  <div className="loading-text">Filtering events...</div>
                </div>
              ) : displayedEvents.length === 0 ? (
                <div className="no-events">
                  <div className="no-events-icon">⚠</div>
                  <div className="no-events-text">No events found matching your filters</div>
                </div>
              ) : (
                <>
                  {displayedEvents.map((event) => (
                    <a key={event.id} href={`/events/${event.id}`} className="event-card">
                      <div className="event-header">
                        <span className="event-date">{new Date(event.startDate).toLocaleDateString()}</span>
                        <span className="event-type">{event.type}</span>
                      </div>
                      <div className="event-name">{event.name}</div>
                      <div className="event-categories">
                        {event.categories?.map((cat: Category, i: number) => (
                          <span key={i} className="category-tag">
                            {cat.name}
                            {cat.subcategories?.length > 0 && (
                              <span className="subcategory-tag">
                                {cat.subcategories[0].replace(/_/g, ' ')}
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    </a>
                  ))}
                  {isLoadingMore && (
                    <div className="loading-more">
                      <div className="loading-spinner"></div>
                      <div className="loading-text">Loading more events...</div>
                    </div>
                  )}
                </>
              )}
            </div>
          </Panel>
        </div>

        <div className="filters-section">
          <Panel title="FILTERS" systemId="FIL-001" variant="secondary">
            <div className="filters-content">
              {/* Search Bar */}
              <div className="filter-group">
                <h3 className="filter-title">SEARCH</h3>
                <div className="search-container">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      const newQuery = e.target.value;
                      setSearchQuery(newQuery);
                      // Reset to first page when search changes
                      setPage(1);
                      setDisplayedEvents([]);
                    }}
                    placeholder="Search events by name, type, location..."
                    className="search-input"
                  />
                  <div className="search-icon">⌕</div>
                </div>
                {searchQuery.trim() && (
                  <div className="search-results-count">
                    Found {filteredEvents.length} matching events
                  </div>
                )}
              </div>

              {/* Date Range Filter */}
              <div className="filter-group">
                <h3 className="filter-title">DATE RANGE</h3>
                <div className="filter-options">
                  {dateRanges.map(range => (
                    <FilterButton
                      key={range.id}
                      label={range.name}
                      isActive={dateRange === range.id}
                      onClick={() => setDateRange(range.id)}
                    />
                  ))}
                </div>
              </div>

              {/* Time of Day Filter */}
              <div className="filter-group">
                <h3 className="filter-title">TIME OF DAY</h3>
                <div className="filter-options">
                  {Object.entries(timeRanges).map(([timeId, range]) => {
                    const count = filteredEvents.filter(event => 
                      getTimeOfDay(new Date(event.startDate)) === timeId
                    ).length;

                    return (
                      <FilterButton
                        key={timeId}
                        label={range.label}
                        count={count}
                        isActive={selectedTimes.includes(timeId)}
                        onClick={() => toggleTime(timeId)}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Categories Filter */}
              <div className="filter-group">
                <h3 className="filter-title">CATEGORIES</h3>
                <div className="filter-options">
                  {allCategories.map(categoryId => {
                    const categoryInfo = filteredEvents.find(
                      event => event.categories?.find((cat: Category) => cat.id === categoryId)
                    )?.categories?.find((cat: Category) => cat.id === categoryId);
                    
                    if (!categoryInfo) return null;

                    const count = filteredEvents.filter(event =>
                      event.categories?.some((cat: Category) => cat.id === categoryId)
                    ).length;

                    return (
                      <FilterButton
                        key={categoryId}
                        label={categoryInfo.name}
                        count={count}
                        isActive={selectedCategories.includes(categoryId)}
                        onClick={() => toggleCategory(categoryId)}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <style jsx>{`
        .events-page {
          width: 100%;
          height: 100%;
        }

        .events-layout {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 1rem;
          height: 100%;
          padding: 1rem;
        }

        .main-section {
          height: 100%;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .events-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 0;
          padding: 0;
          overflow-y: auto;
          max-height: calc(100vh - 100px);
        }

        .event-card {
          display: flex;
          flex-direction: column;
          padding: 1rem;
          background: rgba(0, 56, 117, 0.3);
          border: 1px solid rgba(0, 56, 117, 0.3);
          text-decoration: none;
          color: var(--nyc-white);
          transition: all 0.2s ease;
          height: 180px;
          margin: 0;
          border-right: none;
          border-bottom: none;
        }

        .event-card:last-child {
          border-right: 1px solid rgba(0, 56, 117, 0.3);
        }

        .events-grid > *:nth-last-child(-n+3) {
          border-bottom: 1px solid rgba(0, 56, 117, 0.3);
        }

        .event-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }

        .event-date {
          color: var(--nyc-orange);
          font-family: var(--font-mono);
          font-size: 0.8rem;
        }

        .event-type {
          color: var(--terminal-color);
          font-family: var(--font-mono);
          font-size: 0.8rem;
        }

        .event-name {
          font-family: var(--font-display);
          font-size: 1.1rem;
          margin-bottom: 0.5rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .event-categories {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: auto;
        }

        .category-tag {
          font-size: 0.7rem;
          padding: 0.2rem 0.5rem;
          background: rgba(0, 255, 255, 0.1);
          border: 1px solid var(--terminal-color);
          color: var(--terminal-color);
          font-family: var(--font-mono);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .subcategory-tag {
          font-size: 0.65rem;
          padding: 0.1rem 0.4rem;
          background: rgba(0, 56, 117, 0.5);
          border-left: 1px solid var(--terminal-color);
          text-transform: capitalize;
        }

        .filters-content {
          height: calc(100vh - 100px);
          overflow-y: auto;
          padding: 1rem;
        }

        .filter-group {
          margin-bottom: 2rem;
          border-bottom: 1px solid rgba(0, 56, 117, 0.3);
          padding-bottom: 1rem;
        }

        .filter-group:last-child {
          border-bottom: none;
        }

        .filter-title {
          font-family: var(--font-mono);
          color: var(--nyc-orange);
          font-size: 0.9rem;
          margin-bottom: 1rem;
        }

        .filter-options {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .search-container {
          position: relative;
          width: 100%;
        }

        .search-input {
          width: 100%;
          padding: 0.75rem;
          padding-right: 2.5rem;
          background: rgba(0, 56, 117, 0.3);
          border: 1px solid var(--nyc-orange);
          color: var(--nyc-white);
          font-family: var(--font-mono);
          font-size: 0.9rem;
          transition: all 0.2s ease;
          clip-path: polygon(0 0, 100% 0, 95% 100%, 0 100%);
        }

        .search-input::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }

        .search-input:focus {
          outline: none;
          background: rgba(0, 56, 117, 0.5);
          border-color: var(--terminal-color);
          box-shadow: 0 0 15px rgba(255, 107, 28, 0.2);
        }

        .search-icon {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--nyc-orange);
          font-size: 1.2rem;
          pointer-events: none;
          opacity: 0.8;
        }

        .search-container:focus-within .search-icon {
          color: var(--terminal-color);
        }

        @media (max-width: 1024px) {
          .events-layout {
            grid-template-columns: 1fr;
            grid-template-rows: auto 1fr;
          }

          .events-grid {
            gap: 0;
            padding: 0;
          }

          .event-card {
            border-right: 1px solid rgba(0, 56, 117, 0.3);
          }
        }

        @media (max-width: 768px) {
          .event-card {
            height: 160px;
            padding: 0.75rem;
          }
        }

        @media (max-width: 480px) {
          .event-card {
            height: 140px;
            padding: 0.5rem;
          }
        }

        .load-more-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 2rem;
          border-top: 1px solid rgba(255, 107, 28, 0.2);
        }

        .load-more-button {
          background: rgba(0, 56, 117, 0.3);
          border: 1px solid var(--nyc-orange);
          color: var(--nyc-white);
          padding: 0.75rem 2rem;
          font-family: var(--font-display);
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
          clip-path: polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%);
        }

        .load-more-button:hover {
          background: rgba(0, 56, 117, 0.5);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(255, 107, 28, 0.2);
        }

        .events-count {
          color: var(--nyc-orange);
          font-family: var(--font-mono);
          font-size: 0.9rem;
          opacity: 0.8;
        }

        @media (max-width: 768px) {
          .load-more-button {
            width: 100%;
            padding: 0.6rem 1rem;
            font-size: 0.9rem;
          }
        }

        .loading-more {
          grid-column: 1 / -1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 2rem;
          color: var(--nyc-orange);
          font-family: var(--font-mono);
          font-size: 0.9rem;
        }

        .loading-spinner {
          width: 24px;
          height: 24px;
          border: 2px solid var(--nyc-orange);
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .loading-text {
          opacity: 0.8;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .events-grid::-webkit-scrollbar {
          width: 8px;
        }

        .events-grid::-webkit-scrollbar-track {
          background: rgba(0, 56, 117, 0.3);
        }

        .events-grid::-webkit-scrollbar-thumb {
          background-color: var(--nyc-orange);
          border-radius: 4px;
        }

        .filtering-loading,
        .no-events {
          grid-column: 1 / -1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          padding: 4rem 2rem;
          color: var(--nyc-orange);
          font-family: var(--font-mono);
          text-align: center;
        }

        .no-events-icon {
          font-size: 2rem;
          color: var(--nyc-orange);
          animation: pulse 2s infinite;
        }

        .no-events-text {
          font-size: 1.1rem;
          opacity: 0.8;
        }

        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 0.5; }
        }

        .search-results-count {
          margin-top: 0.5rem;
          font-size: 0.8rem;
          color: var(--terminal-color);
          font-family: var(--font-mono);
          opacity: 0.8;
        }
      `}</style>
    </main>
  );
} 