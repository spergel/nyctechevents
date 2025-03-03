'use client';
import React, { useState, useEffect } from 'react';
import locations from '@/public/data/locations.json';
import { Panel } from '@/app/components/ui/Panel';
import { CyberMap } from '@/app/components/ui/CyberMap';
import Loading from '@/app/loading';
import { FilterDialog } from '@/app/components/ui/FilterDialog';
import { FilterToggleButton } from '@/app/components/ui/FilterToggleButton';
import { FilterButton } from '@/app/components/ui/FilterButton';
import { saveFilterState, loadFilterState } from '@/app/utils/filterState';
import { LocationDetailDialog } from '@/app/components/ui/LocationDetailDialog';
import { CommunityDetailDialog } from '@/app/components/ui/CommunityDetailDialog';
import { EventDetailDialog } from '@/app/components/ui/EventDetailDialog';
import { Event } from '@/app/types/event';
import { Location, getEventsForLocation, getCommunitiesForLocation, getCommunityData } from '@/app/utils/dataHelpers';

export default function Locations() {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedCommunity, setSelectedCommunity] = useState<any | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

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

  // Load saved filter state on mount
  useEffect(() => {
    const savedState = loadFilterState('locations');
    if (savedState) {
      setSelectedTypes(savedState.selectedTypes || []);
    }
  }, []);

  // Save filter state when it changes
  useEffect(() => {
    saveFilterState('locations', {
      selectedTypes
    });
  }, [selectedTypes]);


  // Get unique location types with counts
  const locationTypes = Array.from(new Set((locations?.locations || []).map(l => l.type)))
    .map(type => ({
      id: type,
      name: type,
      count: (locations?.locations || []).filter(l => l.type === type).length
    }));

  const filteredLocations = (locations?.locations || []).filter(location =>
    selectedTypes.length === 0 || selectedTypes.includes(location.type)
  );

  const toggleType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const clearAllFilters = () => {
    setSelectedTypes([]);
  };

  // Prepare filter groups for the FilterDialog
  const filterGroups = [
    {
      title: 'LOCATION TYPES',
      options: locationTypes,
      selectedIds: selectedTypes,
      onToggle: toggleType
    }
  ];

  // Handle selecting a location from click
  const handleLocationClick = (location: Location) => {
    setSelectedLocation(location);
  };

  // Handle selecting a community from a location
  const handleCommunitySelect = (communityId: string) => {
    const community = getCommunityData(communityId);
    if (community) {
      setSelectedLocation(null);
      setSelectedCommunity(community);
    }
  };

  // Handle selecting an event
  const handleEventSelect = (event: Event) => {
    setSelectedLocation(null);
    setSelectedCommunity(null);
    setSelectedEvent(event);
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <main className="page-layout">

      {/* Filter Toggle Button (Mobile Only) */}
      {isMobile && (
        <FilterToggleButton 
          isActive={isFilterDialogOpen}
          onClick={() => setIsFilterDialogOpen(!isFilterDialogOpen)}
          resultCount={filteredLocations.length}
        />
      )}

      {/* Filter Dialog (Mobile Only) */}
      {isMobile && (
        <FilterDialog
          title="LOCATION FILTERS"
          systemId="LOC-FIL-001"
          isOpen={isFilterDialogOpen}
          onClose={() => setIsFilterDialogOpen(false)}
          filterGroups={filterGroups}
          resultCount={filteredLocations.length}
          onClearAll={clearAllFilters}
        />
      )}

      <div className="locations-layout">
        {/* Left Column - Location List */}
        <div className="locations-list">
          <Panel title="NYC LOCATIONS" systemId="LOC-001">
            <div className="items-grid">
              {filteredLocations.map(location => {
                // Check if this location is also a community
                const isCommunity = location.community_and_location === true;
                
                return (
                  <div 
                    key={location.id} 
                    className="location-card"
                    onClick={() => handleLocationClick(location)}
                  >
                    <div className="location-header">
                      <div className="location-type">{location.type}</div>
                      {isCommunity && <div className="community-badge">Community</div>}
                    </div>
                    <h3 className="location-name">{location.name}</h3>
                    <div className="location-address">{location.address}</div>
                    {location.amenities && location.amenities.length > 0 && (
                      <div className="location-amenities">
                        {location.amenities.slice(0, 3).map((amenity, index) => (
                          <span key={index} className="amenity-tag">{amenity}</span>
                        ))}
                        {location.amenities.length > 3 && (
                          <span className="more-tag">+{location.amenities.length - 3} more</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>

        {/* Right Column - Map and Filters */}
        <div className={`map-and-filters ${isMobile ? 'desktop-only' : ''}`}>
          {/* Map Section */}
          <div className="map-section">
            <Panel 
              variant="secondary"
              footerStats={{
                left: "SCAN: ACTIVE",
                right: "TARGETS: " + filteredLocations.length
              }}
            >
              <div className="map-content" style={{ position: 'relative', height: '600px', width: '100%' }}>
                <CyberMap 
                  locations={(locations?.locations || []) as Location[]}
                  selectedTypes={selectedTypes}
                  onLocationClick={(location) => {
                    setSelectedLocation(location);
                  }}
                />
              </div>
            </Panel>
          </div>

          {/* Filters Section */}
          <div className="filters-section">
            <div className="filter-list">
              {locationTypes.map(type => (
                <FilterButton
                  key={type.id}
                  label={type.name}
                  count={type.count}
                  isActive={selectedTypes.includes(type.id)}
                  onClick={() => toggleType(type.id)}
                  variant="compact"
                />
              ))}
              {selectedTypes.length > 0 && (
                <FilterButton
                  label="CLEAR ALL"
                  isActive={false}
                  onClick={clearAllFilters}
                  variant="compact"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Location Detail Dialog when a location is selected */}
      <LocationDetailDialog
        location={selectedLocation}
        isOpen={selectedLocation !== null}
        onClose={() => setSelectedLocation(null)}
        onEventSelect={handleEventSelect}
        onCommunitySelect={handleCommunitySelect}
      />
      
      {/* Community Detail Dialog when a community is selected */}
      <CommunityDetailDialog
        community={selectedCommunity}
        isOpen={selectedCommunity !== null}
        onClose={() => setSelectedCommunity(null)}
        onEventSelect={handleEventSelect}
      />
      
      {/* Event Detail Dialog when an event is selected */}
      <EventDetailDialog
        event={selectedEvent}
        isOpen={selectedEvent !== null}
        onClose={() => setSelectedEvent(null)}
      />

      <style jsx>{`
        .page-layout {
          display: flex;
          flex-direction: column;
          height: 100vh;
          overflow: hidden;
        }

        .locations-layout {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 1rem;
          padding: 1rem;
          flex: 1;
          min-height: 0; /* Important for nested scrolling */
        }

        .locations-list {
          min-height: 0; /* Important for nested scrolling */
          overflow: hidden;
        }

        .items-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }

        .location-card {
          background: rgba(0, 56, 117, 0.2);
          border: 1px solid rgba(0, 56, 117, 0.3);
          padding: 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .location-card:hover {
          background: rgba(0, 56, 117, 0.4);
          border-color: var(--terminal-color);
        }
        
        .location-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.75rem;
        }
        
        .location-type {
          font-size: 0.8rem;
          padding: 0.2rem 0.5rem;
          background: rgba(0, 56, 117, 0.3);
          border: 1px solid var(--terminal-color);
          color: var(--terminal-color);
        }
        
        .community-badge {
          font-size: 0.8rem;
          padding: 0.2rem 0.5rem;
          background: rgba(0, 56, 117, 0.2);
          border: 1px solid var(--nyc-orange);
          color: var(--nyc-orange);
        }
        
        .location-name {
          color: var(--nyc-white);
          margin: 0 0 0.5rem 0;
          font-size: 1.1rem;
        }
        
        .location-address {
          color: var(--terminal-color);
          font-size: 0.9rem;
          margin-bottom: 0.75rem;
          font-family: var(--font-mono);
        }
        
        .location-amenities {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        
        .amenity-tag, .more-tag {
          font-size: 0.8rem;
          padding: 0.2rem 0.5rem;
          background: rgba(0, 20, 40, 0.3);
          border: 1px solid rgba(0, 56, 117, 0.3);
          color: var(--nyc-white);
        }
        
        .more-tag {
          color: var(--terminal-color);
        }

        .map-and-filters {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 1rem;
          height: 100%;
          min-height: 0; /* Important for nested scrolling */
        }

        .map-section {
          height: 100%;
          min-height: 0;
        }

        .filters-section {
          width: 200px;
          background: var(--panel-bg);
          border: 1px solid var(--nyc-orange);
          padding: 0.75rem;
          border-radius: 4px;
        }

        .filter-list {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        @media (max-width: 1024px) {
          .locations-layout {
            grid-template-columns: 1fr;
          }

          .desktop-only {
            display: none !important;
          }

          .items-grid {
            max-height: none;
            overflow: visible;
          }

          .page-header {
            display: none;
          }
        }
      `}</style>
    </main>
  );
} 