'use client';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import events from '@/public/data/events.json';
import { Panel } from '@/app/components/ui/Panel';
import Loading from '@/app/loading';
import { FilterButton } from '@/app/components/ui/FilterButton';
import { FilterDialog } from '@/app/components/ui/FilterDialog';
import { FilterToggleButton } from '@/app/components/ui/FilterToggleButton';
import { EventDetailDialog } from '../components/ui/EventDetailDialog';
import { CommunityDetailDialog } from '@/app/components/ui/CommunityDetailDialog';
import { LocationDetailDialog } from '@/app/components/ui/LocationDetailDialog';
import { saveFilterState, loadFilterState } from '@/app/utils/filterState';
import { CyberDatePicker } from '@/app/components/ui/CyberDatePicker';
import { getCommunityData, getLocationData } from '@/app/utils/dataHelpers';
import { Event, Category, Community, Location } from '@/app/types';
import { getSocialLink } from '@/app/utils/dataHelpers';

// Use imported Category type
interface SimpleCategory {
  id: string;
  name: string;
  count: number;
}

interface CategoryGroup {
  title: string;
  categories: SimpleCategory[];
}

interface FilterOption {
  id: string;
  name: string;
  count?: number;
}

interface FilterGroup {
  title: string;
  options: FilterOption[];
  selectedIds: string[];
  onToggle: (id: string) => void;
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

  const community = getCommunityData(event.communityId);
  const location = getLocationData(event.locationId);

  const eventText = normalizeText([
    event.name,
    event.description,
    location?.name,
    location?.address,
    community?.name,
    event.locationId,
    event.communityId,
    event.category?.type,
    event.category?.subCategory
  ].filter(Boolean).join(' '));

  // All search terms must be present for a match
  return searchTerms.every(term => eventText.includes(term));
};

const ITEMS_PER_PAGE = 20;

// Add community filter types
interface CommunityGroup {
  id: string;
  name: string;
  type: string;
  count: number;
}

// Helper function to safely create a Date object
const safeDate = (dateStr: string): Date => {
  return new Date(dateStr);
};

// Helper function to compare dates safely
const compareDates = (date1: Date, date2: Date): number => {
  return date1.getTime() - date2.getTime();
};

interface FilterState {
  selectedCategories: string[];
  selectedCommunities: string[];
  startDate: string;
  endDate: string;
  searchQuery: string;
  showPastEvents: boolean;
}

// Add helper function for safe date parsing
const parseSafeDate = (dateStr: string | null): Date | null => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
};

// Add helper function to ensure event has all required fields
const ensureCompleteEvent = (event: any): Event => ({
  ...event,
  category: event.type || '', // Use type as category if not present
  price: event.price || {
    amount: 0,
    type: 'Free',
    currency: 'USD',
    details: ''
  },
  capacity: event.capacity || null,
  registrationRequired: event.registrationRequired || false,
  image: event.image || '',
  status: event.status || 'upcoming',
  metadata: event.metadata || {
    source_url: '',
    featured: false
  },
  endDate: event.endDate || event.startDate // Use startDate as endDate if not present
} as Event);

export default function Events() {
  const [isLoading, setIsLoading] = useState(true);
  
  // Staged state for filters
  const [stagedCategories, setStagedCategories] = useState<string[]>([]);
  const [stagedCommunities, setStagedCommunities] = useState<string[]>([]);
  
  // Active state for filters
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [activeCommunities, setActiveCommunities] = useState<string[]>([]);

  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState(''); // New state for input value
  const [stagedSearchQuery, setStagedSearchQuery] = useState(''); // New staged search state for mobile
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [visibleItems, setVisibleItems] = useState(ITEMS_PER_PAGE);
  const [hasMore, setHasMore] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  
  const observerTarget = useRef<HTMLDivElement>(null);

  const applyFilters = useCallback(() => {
    setActiveCategories(stagedCategories);
    setActiveCommunities(stagedCommunities);
    setSearchQuery(stagedSearchQuery); // Apply staged search query
    setVisibleItems(ITEMS_PER_PAGE);
  }, [stagedCategories, stagedCommunities, stagedSearchQuery]);

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

  // Handle search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setVisibleItems(ITEMS_PER_PAGE);
  };

  // Handle search input change
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  };

  // Handle search clear
  const handleSearchClear = () => {
    setSearchInput('');
    setSearchQuery('');
    setVisibleItems(ITEMS_PER_PAGE);
  };

  // Toggle filters expansion
  const toggleFiltersExpansion = () => {
    setIsFiltersExpanded(!isFiltersExpanded);
  };

  // Save filter state
  useEffect(() => {
    const filterState: FilterState = {
      selectedCategories: activeCategories,
      selectedCommunities: activeCommunities,
      startDate: startDate ? startDate.toISOString() : '',
      endDate: endDate ? endDate.toISOString() : '',
      searchQuery,
      showPastEvents
    };
    localStorage.setItem('eventFilters', JSON.stringify(filterState));
  }, [activeCategories, activeCommunities, startDate, endDate, searchQuery, showPastEvents]);

  // Load filter state
  useEffect(() => {
    const savedFilters = localStorage.getItem('eventFilters');
    if (savedFilters) {
      const savedState = JSON.parse(savedFilters) as FilterState;
      const categories = savedState.selectedCategories || [];
      const communities = savedState.selectedCommunities || [];
      
      setActiveCategories(categories);
      setStagedCategories(categories);
      setActiveCommunities(communities);
      setStagedCommunities(communities);
      
      // If showPastEvents was saved in the filter state, use that value
      if ('showPastEvents' in savedState) {
        setShowPastEvents(savedState.showPastEvents);
      }
      
      // If we're showing past events, honor the saved startDate, otherwise use today
      if (savedState.showPastEvents && savedState.startDate) {
        setStartDate(new Date(savedState.startDate));
      } else if (!savedState.showPastEvents) {
        setStartDate(new Date());
      }
      
      setEndDate(savedState.endDate ? new Date(savedState.endDate) : null);
      setSearchQuery(savedState.searchQuery || '');
      setSearchInput(savedState.searchQuery || '');
      setStagedSearchQuery(savedState.searchQuery || ''); // Initialize staged search
    }
  }, []);

  const categoryGroups = useMemo(() => {
    const categoryMap = new Map<string, { id: string; name: string; count: number; subCategories: Map<string, { id: string; name: string; count: number }> }>();

    events.events.forEach(event => {
      let categoryName: string | undefined;
      let subCategoryName: string | undefined;

      if (typeof event.category === 'string') {
        categoryName = event.category;
      } else if (event.category && typeof event.category === 'object' && 'type' in event.category) {
        categoryName = (event.category as any).type;
        subCategoryName = (event.category as any).subCategory;
      }

      if (categoryName) {
        if (!categoryMap.has(categoryName)) {
          categoryMap.set(categoryName, {
            id: categoryName,
            name: categoryName,
            count: 0,
            subCategories: new Map()
          });
        }
        
        const mainCategory = categoryMap.get(categoryName)!;
        mainCategory.count++;

        if (subCategoryName) {
          const subCategoryMap = mainCategory.subCategories;
          if (!subCategoryMap.has(subCategoryName)) {
            subCategoryMap.set(subCategoryName, {
              id: `${categoryName}-${subCategoryName}`,
              name: subCategoryName,
              count: 0
            });
          }
          subCategoryMap.get(subCategoryName)!.count++;
        }
      }
    });

    // Convert the map to the desired array structure for rendering
    return Array.from(categoryMap.values()).map(typeDetails => ({
      ...typeDetails,
      subCategories: Array.from(typeDetails.subCategories.values()).sort((a, b) => b.count - a.count)
    })).sort((a, b) => b.count - a.count);
  }, []);

  // Update communityGroups calculation
  const communityGroups = useMemo(() => {
    const communityMap = new Map<string, CommunityGroup>();
    
    // Only count upcoming events for filter counts
    const now = new Date();
    const upcomingEvents = events.events.filter(event => {
      const eventDate = parseSafeDate(event.startDate || null);
      return eventDate ? eventDate >= now : false;
    });
    
    upcomingEvents.forEach(event => {
      // Primary community
      const community = getCommunityData(event.communityId);
      if (community) {
        if (!communityMap.has(community.id)) {
          communityMap.set(community.id, {
            id: community.id,
            name: community.name,
            type: community.type,
            count: 0
          });
        }
        communityMap.get(community.id)!.count++;
      }
      
      // Secondary communities (from metadata.associated_communities)
      const metadata = event.metadata as { associated_communities?: string[] };
      if (metadata?.associated_communities) {
        metadata.associated_communities.forEach((communityId: string) => {
          const secondaryCommunity = getCommunityData(communityId);
          if (secondaryCommunity && communityId !== event.communityId) {
            if (!communityMap.has(communityId)) {
              communityMap.set(communityId, {
                id: communityId,
                name: secondaryCommunity.name,
                type: secondaryCommunity.type,
                count: 0
              });
            }
            communityMap.get(communityId)!.count++;
          }
        });
      }
    });

    return Array.from(communityMap.values())
      .sort((a, b) => b.count - a.count);
  }, []);

  // Update filteredEvents logic
  const filteredEvents = useMemo(() => events.events.filter(event => {
    // Filter out past events if showPastEvents is false
    if (!showPastEvents) {
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Reset to start of today
      const eventStartDate = parseSafeDate(event.startDate || null);
      if (!eventStartDate || eventStartDate < now) {
        return false;
      }
    }

    // Category filter
    if (activeCategories.length > 0) {
      // Handle category as either array of strings or Category object
      const eventCategories = Array.isArray((event as any).category) 
        ? (event as any).category as string[]
        : [event.type];
      
      const eventCategoryObj = event.category as any;
      const eventCategoryType = Array.isArray((event as any).category) 
        ? event.type 
        : eventCategoryObj?.name || eventCategoryObj?.id;
      
      const eventSubCategory = Array.isArray((event as any).category) 
        ? undefined 
        : (eventCategoryObj as any)?.subCategory;
      
      const eventSubCategoryId = eventCategoryType && eventSubCategory 
        ? `${eventCategoryType}-${eventSubCategory}` 
        : '';

      const isSelected = activeCategories.some(selectedCatId => {
        // Check if any category matches, main category type, or specific subcategory
        return eventCategories.includes(selectedCatId) || 
               selectedCatId === eventCategoryType || 
               selectedCatId === eventSubCategoryId ||
               selectedCatId === event.type;
      });
      
      if (!isSelected) {
        return false;
      }
    }

    // Community filter
    if (activeCommunities.length > 0) {
      if (!event.communityId || !activeCommunities.includes(event.communityId)) {
      return false;
      }
    }

    // Date filter
    if (startDate || endDate) {
      const eventStartDate = parseSafeDate(event.startDate || null);
      const eventEndDate = parseSafeDate(event.endDate || null);
      
      if (startDate && eventStartDate && eventStartDate < startDate) {
        return false;
      }
      if (endDate && eventEndDate && eventEndDate > endDate) {
        return false;
      }
    }

    // Search filter
    if (searchQuery && !eventMatchesSearch(event, searchQuery)) {
      return false;
    }

    return true;
  }), [events.events, activeCategories, activeCommunities, startDate, endDate, searchQuery, showPastEvents]);

  // Update sortedEvents logic
  const sortedEvents = useMemo(() => {
    return [...filteredEvents].sort((a, b) => {
      const dateA = parseSafeDate(a.startDate || null);
      const dateB = parseSafeDate(b.startDate || null);
      if (!dateA || !dateB) return 0;
      return dateA.getTime() - dateB.getTime();
    });
  }, [filteredEvents]);

  // Update the load more function for infinite scroll
  const handleLoadMore = useCallback(() => {
    if (isLoadingMore) return;
    
    setIsLoadingMore(true);
    // Use a short timeout to avoid blocking the UI
    setTimeout(() => {
      setVisibleItems((prev: number) => {
        const nextItems = prev + ITEMS_PER_PAGE;
        // Check if we have more items to show
        setHasMore(nextItems < sortedEvents.length);
        return nextItems;
      });
      setIsLoadingMore(false);
    }, 300);
  }, [sortedEvents.length, isLoadingMore]);

  // Reset visible items when filters change
  useEffect(() => {
    // Reset to initial page of items whenever filters change
    setVisibleItems(ITEMS_PER_PAGE);
    setHasMore(sortedEvents.length > ITEMS_PER_PAGE);
    setIsLoadingMore(false);
  }, [sortedEvents.length]);

  // Initialize the loading state
  useEffect(() => {
    // Initial loading state
    setIsLoading(true);
    
    // Short timeout to simulate data loading
    setTimeout(() => {
      setIsLoading(false);
      // Check if we need to enable infinite scrolling
      setHasMore(sortedEvents.length > ITEMS_PER_PAGE);
    }, 500);
  }, [sortedEvents.length]);

  // Implement infinite scroll using Intersection Observer
  useEffect(() => {
    // Don't set up observer while initial loading is happening
    if (isLoading || !observerTarget.current) return;
    
    const observer = new IntersectionObserver(
      entries => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !isLoadingMore) {
          handleLoadMore();
        }
      },
      { 
        threshold: isMobile ? 0.1 : 0.2,
        rootMargin: isMobile ? '300px' : '200px' 
      }
    );

    // Check if already in viewport on initial load (important!)
    const checkInitialIntersection = () => {
      if (observerTarget.current) {
        const rect = observerTarget.current.getBoundingClientRect();
        const isInViewport = (
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
          rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
        
        if (isInViewport && hasMore && !isLoadingMore) {
          handleLoadMore();
        }
      }
    };
    
    // Run initial check
    checkInitialIntersection();

    // Then observe for future intersections
    observer.observe(observerTarget.current);
    
    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [observerTarget, hasMore, isLoadingMore, handleLoadMore, isMobile, isLoading]);

  // Handle events, communities, and locations selection
  const handleEventClick = (e: React.MouseEvent, event: any) => {
    e.preventDefault();
    setSelectedEvent(ensureCompleteEvent(event));
  };

  const handleCommunityClick = (communityId: string | undefined) => {
    if (!communityId) return;
    const communityData = getCommunityData(communityId);
    if (communityData) {
      setSelectedEvent(null);
      setSelectedCommunity(communityData);
    }
  };

  const handleLocationClick = (locationId: string | undefined) => {
    if (!locationId) return;
    const locationData = getLocationData(locationId);
    if (locationData) {
      setSelectedEvent(null);
      setSelectedLocation(locationData);
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <main className="page-layout">

      {/* Top Search Bar */}
      <div className="top-search-bar">
        <form onSubmit={handleSearchSubmit} className="search-form">
          <div className="search-input-container">
            <input
              type="text"
              placeholder="Search NYC events..."
              value={searchInput}
              onChange={handleSearchInputChange}
              className="search-input"
            />
            <div className="search-buttons">
              {searchInput && (
                <button
                  type="button"
                  onClick={handleSearchClear}
                  className="search-clear-btn"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
              <button
                type="submit"
                className="search-submit-btn"
                title="Search"
              >
                🔍
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Filter Toggle Button (Mobile Only) */}
      {isMobile && (
        <FilterToggleButton 
          isActive={isFilterDialogOpen}
          onClick={() => setIsFilterDialogOpen(!isFilterDialogOpen)}
          resultCount={sortedEvents.length}
        />
      )}

      <div className={`events-layout ${isFiltersExpanded ? 'filters-expanded' : ''}`}>
        {/* Left Column - Filters */}
        <div className={`filters-section ${isMobile ? 'desktop-only' : ''}`}>
          <Panel title="FILTERS" systemId="EVT-FIL-001" variant="secondary">
            <div className="filters-header">
              <div className="filter-actions">
                <button 
                  className="apply-filters-btn"
                  onClick={applyFilters}
                >
                  APPLY
                </button>
                            <button 
                  className="clear-filters-btn"
                  onClick={() => {
                    setStagedCategories([]);
                    setStagedCommunities([]);
                    setActiveCategories([]);
                    setActiveCommunities([]);
                    setStartDate(new Date()); // Reset to today
                    setEndDate(null);
                    setSearchQuery('');
                    setSearchInput(''); // Also clear the search input
                    setShowPastEvents(false); // Reset to hide past events
                    setVisibleItems(ITEMS_PER_PAGE);
                  }}
                >
                  CLEAR ALL
                            </button>
                          </div>
                            <button 
                className="expand-filters-btn"
                onClick={toggleFiltersExpansion}
                title={isFiltersExpanded ? "Collapse filters" : "Expand filters"}
                            >
                {isFiltersExpanded ? "◀" : "▶"}
                            </button>
                          </div>
            <div className="filters-content">
              <div className="filter-group">
                <h3 className="filter-title">SEARCH</h3>
                <form onSubmit={handleSearchSubmit} className="search-form">
                  <div className="search-input-container">
                <input
                  type="text"
                      placeholder="Search events by name..."
                      value={searchInput}
                      onChange={handleSearchInputChange}
                  className="search-input"
                />
                    <div className="search-buttons">
                      {searchInput && (
                <button 
                          type="button"
                          onClick={handleSearchClear}
                          className="search-clear-btn"
                          title="Clear search"
                        >
                          ✕
                        </button>
                      )}
                      <button
                        type="submit"
                        className="search-submit-btn"
                        title="Search"
                      >
                        🔍
                </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Date Range Filters */}
              <div className="filter-group">
                <h3 className="filter-title">DATE RANGE</h3>
                <div className="date-filters">
                  <CyberDatePicker
                    selectedDate={startDate}
                    onChange={(date) => {
                      setStartDate(date);
                    }}
                    label="Start Date"
                    placeholder="FROM"
                  />
                  <CyberDatePicker
                    selectedDate={endDate}
                    onChange={(date) => {
                      setEndDate(date);
                    }}
                    label="End Date"
                    placeholder="TO"
                  />
                </div>
              </div>

              {/* Past Events Toggle */}
              <div className="filter-group">
                <button 
                  className={`past-events-toggle ${showPastEvents ? 'active' : ''}`}
                  onClick={() => setShowPastEvents(!showPastEvents)}
                >
                  {showPastEvents ? 'HIDE PAST EVENTS' : 'SHOW PAST EVENTS'}
                </button>
              </div>

              <div className="filter-columns">
              {/* Categories Filter */}
              <div className="filter-group">
                <h3 className="filter-title">CATEGORIES</h3>
                <div className="filter-options">
                    {categoryGroups.map((group) => (
                      <div key={group.id} className="category-group">
                      <FilterButton
                          label={group.name}
                          count={group.count}
                          isActive={stagedCategories.includes(group.id)}
                        onClick={() => {
                            setStagedCategories((prev) => 
                              prev.includes(group.id)
                                ? prev.filter((c) => c !== group.id && !group.subCategories.some(sub => `${group.id}-${sub.name}` === c))
                                : [...prev, group.id]
                            );
                        }}
                        variant='compact'
                      />
                      
                        {/* Show subcategories */}
                        <div className="subcategory-list">
                          {group.subCategories.map((sub) => (
                        <FilterButton
                          key={sub.id}
                          label={sub.name}
                          count={sub.count}
                              isActive={stagedCategories.includes(sub.id)}
                          onClick={() => {
                                setStagedCategories((prev) => 
                                  prev.includes(sub.id)
                                    ? prev.filter((c) => c !== sub.id)
                                    : [...prev, sub.id]
                                );
                          }}
                          variant='compact'
                        />
                      ))}
                        </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Community Filter Section */}
              <div className="filter-group">
                <h3 className="filter-title">COMMUNITIES</h3>
                <div className="filter-options">
                  {communityGroups.map((community: any) => (
                    <FilterButton
                      key={community.id}
                      label={`${community.name} (${community.type})`}
                      count={community.count}
                        isActive={stagedCommunities.includes(community.id)}
                      onClick={() => {
                          setStagedCommunities((prev: string[]) => {
                          const newSelection = prev.includes(community.id) 
                            ? prev.filter((c: string) => c !== community.id) 
                            : [...prev, community.id];
                          return newSelection;
                        });
                      }}
                      variant='compact'
                    />
                  ))}
                </div>
                </div>
              </div>
            </div>
          </Panel>
              </div>

        {/* Right Column - Event List */}
        <div className="events-list">
          <Panel title={`NYC EVENTS (${sortedEvents.length})`} systemId="EVT-001">
            <div className="event-cards">
              {sortedEvents.slice(0, visibleItems).map((event: any, index: number) => {
                const community = getCommunityData(event.communityId);
                const location = getLocationData(event.locationId);
                const parsedEventDate = parseSafeDate(event.startDate || null);
                
                if (!parsedEventDate) return null; // Skip events with invalid dates
                
                return (
                  <div 
                    key={`${event.id}-${index}`}
                    className="event-card" 
                    onClick={(e: React.MouseEvent) => handleEventClick(e, event)}
                  >
                    {/* Date Badge */}
                    <div className="event-date">
                      <div className="date-month">{parsedEventDate.toLocaleString('en-US', { month: 'short' }).toUpperCase()}</div>
                      <div className="date-day">{parsedEventDate.getDate()}</div>
                    </div>
                    
                    {/* Event Content */}
                    <div className="event-content">
                      <h3 className="event-name">{event.name}</h3>
                      <div className="event-time">{parsedEventDate.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })}</div>
                      
                      <div className="event-details">
                        {community && event.communityId && (
                          <div className="detail-row">
                            <span className="detail-icon">⚡</span>
                <button 
                              className="detail-link"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                handleCommunityClick(event.communityId);
                  }}
                >
                              {community.name}
                </button>
                          </div>
                        )}
                        
                        {location && event.locationId && (
                          <div className="detail-row">
                            <span className="detail-icon">◎</span>
                            <button 
                              className="detail-link"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                handleLocationClick(event.locationId);
                              }}
                            >
                              {location.name}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Featured Badge */}
                    {event.metadata?.featured && (
                      <div className="featured-badge">Featured</div>
                    )}
                  </div>
                );
              })}
              
              {/* Infinite Scroll Trigger */}
              {hasMore && (
                <div 
                  ref={observerTarget} 
                  className="infinite-scroll-trigger"
                >
                  {isLoadingMore && (
                    <div className="loading-indicator">
                      <span className="loading-dot"></span>
                      <span className="loading-dot"></span>
                      <span className="loading-dot"></span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>

      {/* Event Detail Dialog */}
      <EventDetailDialog
        event={selectedEvent}
        isOpen={selectedEvent !== null}
        onClose={() => setSelectedEvent(null)}
        onCommunityClick={handleCommunityClick}
        onLocationClick={handleLocationClick}
      />

      {/* Community Detail Dialog */}
      <CommunityDetailDialog
        community={selectedCommunity}
        isOpen={selectedCommunity !== null}
        onClose={() => setSelectedCommunity(null)}
        onEventSelect={(event) => {
          setSelectedCommunity(null);
          setSelectedEvent(ensureCompleteEvent(event));
        }}
        onLocationSelect={(location) => {
          setSelectedCommunity(null);
          setSelectedLocation(location);
        }}
      />

      {/* Location Detail Dialog */}
      <LocationDetailDialog
        location={selectedLocation}
        isOpen={selectedLocation !== null}
        onClose={() => setSelectedLocation(null)}
        onEventSelect={(event) => {
          setSelectedLocation(null);
          setSelectedEvent(ensureCompleteEvent(event));
        }}
      />

      {/* Mobile Filter Dialog */}
      {isMobile && (
        <FilterDialog
          title="EVENT FILTERS"
          systemId="EVT-FIL-002"
          isOpen={isFilterDialogOpen}
          onClose={() => {
            // Reset staged filters to active filters on close
            setStagedCategories(activeCategories);
            setStagedCommunities(activeCommunities);
            setStagedSearchQuery(searchQuery); // Reset staged search to current search
            setIsFilterDialogOpen(false);
          }}
          onApply={applyFilters}
          filterGroups={[
            {
              title: "CATEGORIES",
              options: categoryGroups.flatMap((group) => [
                { id: group.id, name: group.name, count: group.count },
                ...group.subCategories.map(sub => ({ ...sub, name: `  ${sub.name}` })) // Indent subcategories
              ]),
              selectedIds: stagedCategories,
              onToggle: (id: string) => {
                setStagedCategories((prev: string[]) => {
                  return prev.includes(id)
                    ? prev.filter((c: string) => c !== id)
                    : [...prev, id];
                });
              },
              layout: 'list'
            },
            {
              title: "COMMUNITIES",
              options: communityGroups.map((community: any) => ({
                id: community.id,
                name: `${community.name} (${community.type})`,
                count: community.count
              })),
              selectedIds: stagedCommunities,
              onToggle: (id: string) => {
                setStagedCommunities((prev: string[]) => {
                  return prev.includes(id)
                    ? prev.filter((c: string) => c !== id)
                    : [...prev, id];
                });
              },
              layout: 'list'
            }
          ]}
          searchQuery={stagedSearchQuery} // Use staged search query instead
          onSearchChange={(query) => {
            setStagedSearchQuery(query); // Only update staged search, don't apply immediately
          }}
          resultCount={sortedEvents.length}
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={(date) => {
            setStartDate(date);
          }}
          onEndDateChange={(date) => {
            setEndDate(date);
          }}
          showPastEvents={showPastEvents}
          onPastEventsToggle={() => {
            setShowPastEvents(!showPastEvents);
          }}
          onClearAll={() => {
            setStagedCategories([]);
            setStagedCommunities([]);
            setActiveCategories([]);
            setActiveCommunities([]);
            setStartDate(new Date()); // Reset to today
            setEndDate(null);
            setSearchQuery('');
            setSearchInput(''); // Also clear the search input
            setStagedSearchQuery(''); // Clear staged search
            setShowPastEvents(false); // Reset to hide past events
          }}
        />
      )}

      <style jsx>{`
        .page-layout {
          display: flex;
          flex-direction: column;
          height: 100vh;
          overflow: hidden;
        }

        .events-layout {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 1rem;
          padding: 1rem;
          flex: 1;
          min-height: 0;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .events-layout.filters-expanded {
          grid-template-columns: 2fr 1fr;
        }

        .events-list {
          min-height: 0;
          overflow: hidden;
        }

        .event-cards {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
          width: 100%;
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

        .event-date {
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

        .event-name {
          color: var(--nyc-white);
          margin: 0 0 0.5rem 0;
          font-size: 1rem;
          line-height: 1.3;
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

        .detail-link {
          background: transparent;
          border: none;
          color: var(--nyc-white);
          font-size: 0.9rem;
          padding: 0;
          text-align: left;
          cursor: pointer;
        }

        .detail-link:hover {
          color: var(--nyc-orange);
        }

        .featured-badge {
          position: absolute;
          top: 0;
          right: 0;
          background: var(--nyc-orange);
          color: var(--background);
          font-size: 0.7rem;
          padding: 0.2rem 0.5rem;
          font-family: var(--font-mono);
        }

        .load-more-container {
          grid-column: 1 / -1;
          display: flex;
          justify-content: center;
          padding: 1.5rem 0;
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
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 200px;
        }

        .load-more-button:hover:not(:disabled) {
          background: rgba(0, 56, 117, 0.5);
          border-color: var(--nyc-orange);
          color: var(--nyc-orange);
        }

        .load-more-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .loading-indicator {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .loading-dot {
          width: 8px;
          height: 8px;
          background-color: var(--nyc-orange);
          border-radius: 50%;
          display: inline-block;
          animation: pulse 1.2s infinite ease-in-out;
        }

        .loading-dot:nth-child(2) {
          animation-delay: 0.2s;
        }

        .loading-dot:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(0.5);
            opacity: 0.5;
          }
          50% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .filters-section {
          min-height: 0;
          overflow: visible;
          position: sticky;
          top: 1rem;
          max-height: calc(100vh - 2rem);
          display: flex;
          flex-direction: column;
        }

        .filters-content {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          overflow-y: auto;
          padding-right: 0.5rem;
          max-height: calc(100vh - 6rem);
          scrollbar-width: thin;
          scrollbar-color: var(--nyc-orange) rgba(0, 56, 117, 0.3);
        }

        .filters-content::-webkit-scrollbar {
          width: 6px;
        }

        .filters-content::-webkit-scrollbar-track {
          background: rgba(0, 56, 117, 0.3);
        }

        .filters-content::-webkit-scrollbar-thumb {
          background-color: var(--nyc-orange);
          border-radius: 3px;
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
          position: sticky;
          top: 0;
          background: var(--panel-bg);
          padding: 0.5rem 0;
          z-index: 1;
        }

        .filter-options {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding-left: 0;
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
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.75rem;
          transition: all 0.3s ease;
        }

        .events-layout.filters-expanded .date-filters {
          grid-template-columns: 1fr 1fr;
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

        .category-group {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          width: 100%;
        }

        .event-description {
          margin-top: 0.5rem;
          color: var(--nyc-white);
          opacity: 0.7;
          font-size: 0.9rem;
          line-height: 1.4;
        }

        .event-detail {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .detail-section {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .detail-section h3 {
          color: var(--terminal-color);
          font-family: var(--font-mono);
          font-size: 0.9rem;
          margin: 0;
        }

        .detail-section p {
          color: var(--nyc-white);
          font-size: 1rem;
          margin: 0;
          line-height: 1.5;
        }

        .venue-address {
          color: var(--nyc-orange);
          font-family: var(--font-mono);
          font-size: 0.9rem;
        }

        .detail-categories {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .detail-categories .category-tag {
          font-size: 0.8rem;
        }

        .event-community,
        .event-location {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }
        
        .community-label,
        .location-label {
          color: var(--terminal-color);
          font-size: 0.8rem;
          font-family: var(--font-mono);
        }
        
        .community-link,
        .location-link {
          background: rgba(0, 56, 117, 0.2);
          border: 1px solid var(--terminal-color);
          color: var(--nyc-white);
          font-size: 0.9rem;
          padding: 0.25rem 0.5rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }
        
        .community-link:hover,
        .location-link:hover {
          background: rgba(0, 56, 117, 0.4);
          border-color: var(--nyc-orange);
        }
        
        .community-type {
          color: var(--terminal-color);
          font-size: 0.8rem;
        }

        .featured-badge {
          background: var(--accent);
          color: var(--background);
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .event-metadata {
          display: flex;
          gap: 1rem;
          margin-top: 0.5rem;
          font-size: 0.9rem;
          color: var(--text-tertiary);
        }

        .registration-required {
          color: var(--warning);
        }

        .event-price {
          color: var(--success);
        }

        .community-icon,
        .location-icon {
          color: var(--accent);
        }

        .community-info {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .community-info h4 {
          color: var(--nyc-white);
          margin: 0;
          font-size: 1.1rem;
        }

        .community-type {
          color: var(--terminal-color);
          font-size: 0.9rem;
          margin: 0;
        }

        .community-description {
          color: var(--nyc-white);
          opacity: 0.8;
          font-size: 0.9rem;
          line-height: 1.4;
          margin: 0.5rem 0;
        }

        .community-links {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .community-link {
          color: var(--terminal-color);
          text-decoration: none;
          font-size: 0.9rem;
          transition: color 0.2s ease;
        }

        .community-link:hover {
          color: var(--nyc-orange);
        }

        .membership-info {
          display: flex;
          gap: 1rem;
          align-items: center;
          margin-top: 0.5rem;
        }

        .membership-type {
          color: var(--terminal-color);
          font-size: 0.9rem;
          padding: 0.25rem 0.5rem;
          border: 1px solid var(--terminal-color);
        }

        .membership-fee {
          color: var(--nyc-white);
          font-size: 0.9rem;
        }

        .amenities {
          margin-top: 1rem;
        }

        .amenities h5 {
          color: var(--terminal-color);
          font-size: 0.8rem;
          margin: 0 0 0.5rem 0;
        }

        .amenity-tags {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .amenity-tag {
          font-size: 0.8rem;
          padding: 0.25rem 0.5rem;
          background: rgba(0, 255, 255, 0.1);
          border: 1px solid var(--terminal-color);
          color: var(--terminal-color);
        }

        .location-hours {
          margin-top: 1rem;
        }

        .location-hours h5 {
          color: var(--terminal-color);
          font-size: 0.8rem;
          margin: 0 0 0.5rem 0;
        }

        .hours-grid {
          display: grid;
          gap: 0.25rem;
        }

        .hours-row {
          display: grid;
          grid-template-columns: 100px 1fr;
          gap: 1rem;
          font-size: 0.9rem;
        }

        .day {
          color: var(--terminal-color);
        }

        .hours {
          color: var(--nyc-white);
        }

        .event-metadata-grid {
          display: grid;
          gap: 1rem;
        }

        .metadata-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .metadata-label {
          color: var(--terminal-color);
          font-size: 0.9rem;
        }

        .metadata-value {
          color: var(--nyc-white);
          font-size: 0.9rem;
        }

        .metadata-value.required {
          color: var(--nyc-orange);
        }

        @media (max-width: 1024px) {
          .events-layout {
            grid-template-columns: 1fr;
          }

          .events-layout.filters-expanded {
            grid-template-columns: 1fr;
          }
          
          .filters-section {
            display: none;
          }

          .filter-actions {
            flex-direction: column;
            gap: 0.25rem;
          }
          
          .apply-filters-btn,
          .clear-filters-btn {
            font-size: 0.7rem;
            padding: 0.4rem;
          }

          .filters-header {
            margin-bottom: 0.75rem;
            padding-bottom: 0.25rem;
          }
          
          .expand-filters-btn {
            min-width: 1.8rem;
            height: 1.8rem;
            font-size: 0.8rem;
          }
        }

        .infinite-scroll-trigger {
          height: 40px;
          min-height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0;
          padding: 0;
          width: 100%;
          opacity: 0.8;
          background: transparent;
        }

        .loading-indicator {
          display: flex;
          gap: 6px;
          padding: 10px;
          justify-content: center;
        }

        .past-events-toggle {
          width: 100%;
          padding: 0.5rem;
          background: rgba(0, 56, 117, 0.3);
          border: 1px solid var(--terminal-color);
          color: var(--terminal-color);
          font-family: var(--font-mono);
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
        }
        
        .past-events-toggle.active {
          background: rgba(0, 56, 117, 0.5);
          border-color: var(--nyc-orange);
          color: var(--nyc-orange);
        }
        
        .past-events-toggle:hover {
          background: rgba(0, 56, 117, 0.5);
          border-color: var(--nyc-orange);
          color: var(--nyc-orange);
        }

        .filters-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid rgba(255, 107, 28, 0.3);
        }

        .filter-actions {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          flex: 1;
        }

        .apply-filters-btn,
        .clear-filters-btn {
          background: rgba(0, 56, 117, 0.3);
          border: 1px solid var(--nyc-orange);
          color: var(--nyc-orange);
          padding: 0.75rem 1rem;
          font-family: var(--font-mono);
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s ease;
          clip-path: polygon(0 0, 100% 0, 95% 100%, 0 100%);
          flex: 1;
        }

        .apply-filters-btn:hover,
        .clear-filters-btn:hover {
          background: rgba(0, 56, 117, 0.5);
          border-color: var(--terminal-color);
          color: var(--terminal-color);
          box-shadow: 0 0 10px rgba(255, 107, 28, 0.3);
        }

        .apply-filters-btn:active,
        .clear-filters-btn:active {
          transform: translateY(1px);
        }

        .expand-filters-btn {
          background: rgba(0, 56, 117, 0.3);
          border: 1px solid var(--terminal-color);
          color: var(--terminal-color);
          width: 2rem;
          height: 2rem;
          font-family: var(--font-mono);
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-left: 0.5rem;
        }

        .expand-filters-btn:hover {
          background: rgba(0, 56, 117, 0.5);
          border-color: var(--nyc-orange);
          color: var(--nyc-orange);
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
          color: var(--nyc-orange);
          font-family: var(--font-mono);
          font-size: 0.9rem;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .search-form {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .search-input-container {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-input {
          flex: 1;
          padding: 0.75rem;
          padding-right: 4rem;
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

        .search-buttons {
          position: absolute;
          right: 0.5rem;
          display: flex;
          gap: 0.25rem;
        }

        .search-submit-btn,
        .search-clear-btn {
          background: rgba(0, 56, 117, 0.5);
          border: 1px solid var(--nyc-orange);
          color: var(--nyc-orange);
          width: 1.5rem;
          height: 1.5rem;
          font-size: 0.7rem;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .search-submit-btn:hover,
        .search-clear-btn:hover {
          background: rgba(0, 56, 117, 0.7);
          border-color: var(--terminal-color);
          color: var(--terminal-color);
        }

        .date-filters {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .filter-columns {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .filter-options {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .category-group {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .subcategory-list {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          margin-left: 1rem;
          padding-left: 0.5rem;
          border-left: 1px solid rgba(255, 107, 28, 0.3);
        }
      `}</style>
    </main>
  );
} 