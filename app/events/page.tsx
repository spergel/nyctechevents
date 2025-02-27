'use client';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import events from '@/public/data/events.json';
import { Panel } from '@/app/components/ui/Panel';
import Loading from '@/app/loading';
import { FilterButton } from '@/app/components/ui/FilterButton';
import { FilterDialog } from '@/app/components/ui/FilterDialog';
import { FilterToggleButton } from '@/app/components/ui/FilterToggleButton';
import { CompactFilterButton } from '@/app/components/ui/CompactFilterButton';
import { saveFilterState, loadFilterState } from '@/app/utils/filterState';
import { PageNav } from '@/app/components/ui/PageNav';
import { CyberDatePicker } from '@/app/components/ui/CyberDatePicker';

interface Category {
  id: string;
  name: string;
  confidence: number;
  subcategories?: string[];
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

interface CategoryGroup {
  id: string;
  name: string;
  count: number;
  subcategories?: {
    id: string;
    name: string;
    count: number;
  }[];
}

interface CategoryData {
  id: string;
  name: string;
  count: number;
  isAcademic?: boolean;
  parent?: string;
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
const eventMatchesSearch = (event: any, searchQuery: string): boolean => {
  if (!searchQuery.trim()) return true;
  
  const normalizedQuery = normalizeText(searchQuery);
  const searchTerms = normalizedQuery.split(/\s+/).filter(term => term.length >= 2);
  
  if (searchTerms.length === 0) return true;

  const eventText = normalizeText([
    event.name,
    event.description,
    event.venue?.name,
    event.venue?.address,
    event.organizer?.name,
    ...(event.categories?.map((cat: Category) => [cat.name, ...(cat.subcategories || [])]).flat() || [])
  ].filter(Boolean).join(' '));

  // All search terms must be present for a match
  return searchTerms.every(term => eventText.includes(term));
};

const ITEMS_PER_PAGE = 10;

export default function Events() {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [visibleItems, setVisibleItems] = useState(ITEMS_PER_PAGE);
  const [hasMore, setHasMore] = useState(true);
  
  const observerTarget = useRef<HTMLDivElement>(null);

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

  // Load saved filter state
  useEffect(() => {
    const savedState = loadFilterState('events');
    if (savedState) {
      setSelectedCategories(savedState.selectedCategories || []);
      setStartDate(savedState.startDate ? new Date(savedState.startDate) : null);
      setEndDate(savedState.endDate ? new Date(savedState.endDate) : null);
      setSearchQuery(savedState.searchQuery || '');
    }
    setIsLoading(false);
  }, []);

  // Save filter state when it changes
  useEffect(() => {
    saveFilterState('events', {
      selectedCategories,
      startDate,
      endDate,
      searchQuery
    });
  }, [selectedCategories, startDate, endDate, searchQuery]);

  // Get categories and their subcategories
  const categoryGroups = useMemo(() => {
    const categoryMap = new Map<string, CategoryData>();
    
    // First pass: collect all categories and their counts
    events.events.forEach(event => {
      // Handle structured categories
      if (Array.isArray(event.categories)) {
        event.categories.forEach(category => {
          // Handle main category
          if (!categoryMap.has(category.name)) {
            categoryMap.set(category.name, {
              id: category.id,
              name: category.name,
              count: 0
            });
          }
          categoryMap.get(category.name)!.count++;

          // Handle subcategories
          if (category.id === 'academic' && Array.isArray(category.subcategories)) {
            category.subcategories.forEach(sub => {
              const subName = sub.replace(/_/g, ' ');
              const subId = `academic:${sub}`;
              if (!categoryMap.has(subId)) {
                categoryMap.set(subId, {
                  id: subId,
                  name: subName,
                  count: 0,
                  isAcademic: true,
                  parent: 'Academic'
                });
              }
              categoryMap.get(subId)!.count++;
            });
          }
        });
      }
    });

    // Group categories
    const mainCategories: CategoryGroup[] = [];
    const academicSubcategories: CategoryGroup['subcategories'] = [];

    categoryMap.forEach((cat) => {
      if (cat.isAcademic) {
        academicSubcategories.push({
          id: cat.id,
          name: cat.name,
          count: cat.count
        });
      } else {
        mainCategories.push({
          id: cat.id,
          name: cat.name,
          count: cat.count,
          subcategories: cat.name === 'Academic' ? academicSubcategories : undefined
        });
      }
    });

    return mainCategories
      .sort((a, b) => b.count - a.count)
      .map(cat => ({
        ...cat,
        subcategories: cat.subcategories?.sort((a, b) => b.count - a.count)
      }));
  }, []);

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.events
      .filter(event => {
        if (selectedCategories.length > 0) {
          const hasSelectedCategory = selectedCategories.some(selected => {
            // Check if it's an academic subcategory
            if (selected.startsWith('academic:')) {
              const subcategory = selected.split(':')[1];
              return event.categories?.some(cat => 
                cat.id === 'academic' && 
                cat.subcategories?.includes(subcategory)
              );
            }
            
            // Check regular categories
            return event.categories?.some(cat => cat.id === selected);
          });
          
          if (!hasSelectedCategory) return false;
        }

        if (startDate && new Date(event.startDate) < startDate) {
          return false;
        }

        if (endDate && new Date(event.startDate) > endDate) {
          return false;
        }

        return eventMatchesSearch(event, searchQuery);
      })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [selectedCategories, startDate, endDate, searchQuery]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setVisibleItems(prev => {
            const next = prev + ITEMS_PER_PAGE;
            setHasMore(next < filteredEvents.length);
            return next;
          });
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [filteredEvents.length, hasMore]);

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setStartDate(null);
    setEndDate(null);
    setSearchQuery('');
  };

  // Reset visible items when filters change
  useEffect(() => {
    setVisibleItems(ITEMS_PER_PAGE);
    setHasMore(true);
  }, [selectedCategories, startDate, endDate, searchQuery]);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <main className="page-layout">
      <PageNav 
        title="NYC EVENTS" 
        systemId="EVT-001" 
        showBackButton={false}
      />

      {/* Filter Toggle Button (Mobile Only) */}
      {isMobile && (
        <FilterToggleButton 
          isActive={isFilterDialogOpen}
          onClick={() => setIsFilterDialogOpen(!isFilterDialogOpen)}
          resultCount={filteredEvents.length}
        />
      )}

      <div className="events-layout">
        {/* Left Column - Event List */}
        <div className="events-list">
          <Panel title="NYC EVENTS" systemId="EVT-001">
            <div className="items-grid">
              {filteredEvents.slice(0, visibleItems).map((event) => (
                <a key={event.id} href={`/events/${event.id}`} className="item-card">
                  <div className="card-header">
                    <span className="event-date">
                      {new Date(event.startDate).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="event-name">{event.name}</h3>
                  {event.venue && (
                    <div className="event-venue">
                      <span className="venue-icon">◎</span>
                      {event.venue.name}
                      {event.venue.address && (
                        <>
                          <span className="venue-separator">•</span>
                          {event.venue.address}
                        </>
                      )}
                    </div>
                  )}
                  {event.organizer && (
                    <div className="event-organizer">
                      <span className="organizer-icon">⌬</span>
                      {event.organizer.name}
                      {event.organizer.instagram && (
                        <a 
                          href={`https://instagram.com/${event.organizer.instagram.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="social-link"
                        >
                          {event.organizer.instagram}
                        </a>
                      )}
                    </div>
                  )}
                  <div className="event-categories">
                    {event.categories?.map((category, i) => (
                      <span key={i} className="category-tag">{category.name}</span>
                    ))}
                  </div>
                  {event.description && (
                    <div className="event-description">
                      {event.description.length > 200 
                        ? `${event.description.slice(0, 200)}...`
                        : event.description
                      }
                    </div>
                  )}
                </a>
              ))}
              {hasMore && <div ref={observerTarget} className="loading-trigger" />}
            </div>
          </Panel>
        </div>

        {/* Right Column - Filters */}
        <div className="filters-section">
          <Panel title="FILTERS" systemId="EVT-FIL-001" variant="secondary">
            <div className="filters-content">
              {/* Search Input */}
              <div className="filter-group">
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>

              {/* Date Range Filters */}
              <div className="filter-group">
                <h3 className="filter-title">DATE RANGE</h3>
                <div className="date-filters">
                  <CyberDatePicker
                    selectedDate={startDate}
                    onChange={setStartDate}
                    label="Start Date"
                    placeholder="FROM"
                  />
                  <CyberDatePicker
                    selectedDate={endDate}
                    onChange={setEndDate}
                    label="End Date"
                    placeholder="TO"
                  />
                </div>
              </div>

              {/* Categories Filter */}
              <div className="filter-group">
                <h3 className="filter-title">CATEGORIES</h3>
                <div className="filter-options">
                  {categoryGroups.map(category => (
                    <div key={category.id} className="category-group">
                      <CompactFilterButton
                        label={category.name}
                        count={category.count}
                        isActive={selectedCategories.includes(category.id)}
                        onClick={() => {
                          setSelectedCategories(prev => {
                            // If deselecting, remove both category and its subcategories
                            if (prev.includes(category.id)) {
                              return prev.filter(c => 
                                !c.startsWith(`${category.id}:`) && c !== category.id
                              );
                            }
                            // If selecting, just add the category
                            return [...prev, category.id];
                          });
                        }}
                      />
                      
                      {/* Show subcategories if parent is selected */}
                      {selectedCategories.includes(category.id) && category.subcategories && (
                        <div className="subcategories">
                          {category.subcategories.map(sub => (
                            <CompactFilterButton
                              key={sub.id}
                              label={sub.name}
                              count={sub.count}
                              isActive={selectedCategories.includes(sub.id)}
                              onClick={() => {
                                setSelectedCategories(prev => {
                                  return prev.includes(sub.id)
                                    ? prev.filter(c => c !== sub.id)
                                    : [...prev, sub.id];
                                });
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Clear Filters Button */}
              {(selectedCategories.length > 0 || 
                startDate || 
                endDate || 
                searchQuery) && (
                <button 
                  className="clear-filters-button"
                  onClick={clearAllFilters}
                >
                  CLEAR ALL FILTERS
                </button>
              )}
            </div>
          </Panel>
        </div>
      </div>

      <style jsx>{`
        .page-layout {
          display: flex;
          flex-direction: column;
          height: 100vh;
          overflow: hidden;
        }

        .events-layout {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 1rem;
          padding: 1rem;
          flex: 1;
          min-height: 0;
        }

        .events-list {
          min-height: 0;
          overflow: hidden;
        }

        .items-grid {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding: 1rem;
          height: 100%;
          overflow-y: auto;
        }

        .item-card {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 1rem;
          background: rgba(0, 56, 117, 0.3);
          border: 1px solid var(--nyc-orange);
          text-decoration: none;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .item-card:hover {
          transform: translateY(-2px);
          background: rgba(0, 56, 117, 0.5);
          border-color: var(--terminal-color);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .event-date {
          color: var(--terminal-color);
          font-size: 0.8rem;
        }

        .event-name {
          color: var(--nyc-white);
          font-size: 1.1rem;
          margin: 0;
          font-weight: bold;
        }

        .event-venue,
        .event-organizer {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--nyc-white);
          opacity: 0.8;
          font-size: 0.9rem;
        }

        .venue-icon,
        .organizer-icon {
          color: var(--terminal-color);
          font-size: 0.8rem;
        }

        .venue-separator {
          margin: 0 0.5rem;
          color: var(--terminal-color);
        }

        .social-link {
          color: var(--nyc-orange);
          text-decoration: none;
          margin-left: 0.5rem;
          transition: all 0.2s ease;
        }

        .social-link:hover {
          color: var(--terminal-color);
        }

        .event-categories {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .category-tag {
          font-size: 0.7rem;
          padding: 0.25rem 0.5rem;
          background: rgba(0, 255, 255, 0.1);
          border: 1px solid var(--terminal-color);
          color: var(--terminal-color);
        }

        .filters-section {
          min-height: 0;
          overflow: auto;
        }

        .filters-content {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .filter-title {
          color: var(--terminal-color);
          font-size: 0.8rem;
          margin: 0;
          font-family: var(--font-mono);
        }

        .filter-options {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .search-input {
          width: 100%;
          padding: 0.5rem 1rem;
          background: rgba(0, 56, 117, 0.3);
          border: 1px solid var(--nyc-orange);
          color: var(--nyc-white);
          font-family: var(--font-mono);
          font-size: 0.9rem;
        }

        .search-input::placeholder {
          color: var(--terminal-color);
          opacity: 0.5;
        }

        .date-filters {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .clear-filters-button {
          width: 100%;
          padding: 0.5rem;
          background: rgba(0, 56, 117, 0.3);
          border: 1px solid var(--terminal-color);
          color: var(--terminal-color);
          font-family: var(--font-mono);
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: 0.5rem;
        }

        .clear-filters-button:hover {
          background: rgba(0, 56, 117, 0.5);
          border-color: var(--nyc-orange);
          color: var(--nyc-orange);
        }

        .loading-trigger {
          height: 20px;
        }

        .category-group {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          width: 100%;
        }

        .subcategories {
          margin-left: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .event-description {
          margin-top: 0.5rem;
          color: var(--nyc-white);
          opacity: 0.7;
          font-size: 0.9rem;
          line-height: 1.4;
        }

        @media (max-width: 1024px) {
          .events-layout {
            grid-template-columns: 1fr;
          }

          .filters-section {
            order: -1;
          }

          .filter-options {
            flex-direction: row;
            flex-wrap: wrap;
            gap: 0.5rem;
          }

          .date-filters {
            flex-direction: row;
            gap: 1rem;
          }

          .subcategories {
            margin-left: 0;
            flex-direction: row;
            flex-wrap: wrap;
          }
        }
      `}</style>
    </main>
  );
} 