'use client';
import React, { useState, useEffect } from 'react';
import locations from '@/public/data/locations.json';
import { Panel } from '@/app/components/ui/Panel';
import { CyberMap } from '@/app/components/ui/CyberMap';
import Loading from '@/app/loading';
import { ConsoleModule } from '@/app/components/ui/ConsoleModule';
import { FilterDialog } from '@/app/components/ui/FilterDialog';
import { FilterToggleButton } from '@/app/components/ui/FilterToggleButton';
import { CompactFilterButton } from '@/app/components/ui/CompactFilterButton';
import { saveFilterState, loadFilterState } from '@/app/utils/filterState';
import { PageNav } from '@/app/components/ui/PageNav';

export default function Locations() {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

  const locationStats = [
    { label: 'TOTAL', value: locations.locations.length, color: 'var(--terminal-color)' },
    { label: 'ACCESSIBLE', value: locations.locations.filter(l => l.accessibility).length / locations.locations.length * 100, color: 'var(--nyc-orange)' },
  ];

  // Get unique location types with counts
  const locationTypes = Array.from(new Set(locations.locations.map(l => l.type)))
    .map(type => ({
      id: type,
      name: type,
      count: locations.locations.filter(l => l.type === type).length
    }));

  const filteredLocations = locations.locations.filter(location =>
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

  if (isLoading) {
    return <Loading />;
  }

  return (
    <main className="page-layout">
      <PageNav 
        title="NYC LOCATIONS" 
        systemId="LOC-001" 
        showBackButton={false}
      />

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
              {filteredLocations.map((location) => (
                <a key={location.id} href={`/locations/${location.id}`} className="item-card">
                  <div className="card-header">
                    <span className="location-type">{location.type}</span>
                    <span className="location-capacity">CAP: {location.capacity || 'N/A'}</span>
                  </div>
                  <h3 className="location-name">{location.name}</h3>
                  <div className="location-address">{location.address}</div>
                  <div className="location-features">
                    {location.accessibility && (
                      <span className="feature-tag">♿ ACCESSIBLE</span>
                    )}
                    {location.amenities?.slice(0, 2).map((amenity: string, i: number) => (
                      <span key={i} className="feature-tag">{amenity}</span>
                    ))}
                  </div>
                </a>
              ))}
            </div>
          </Panel>
        </div>

        {/* Right Column - Map and Filters */}
        <div className="map-and-filters">
          {/* Map Section */}
          <div className="map-section">
            <ConsoleModule 
              variant="secondary"
              footerStats={{
                left: "SCAN: ACTIVE",
                right: "TARGETS: " + filteredLocations.length
              }}
            >
              <div className="map-content">
                <CyberMap 
                  locations={locations.locations}
                  selectedTypes={selectedTypes}
                  onLocationClick={(location) => {
                    window.location.href = `/locations/${location.id}`;
                  }}
                />
              </div>
            </ConsoleModule>
          </div>

          {/* Filters Section */}
          <div className="filters-section">
            <div className="filter-list">
              {locationTypes.map(type => (
                <CompactFilterButton
                  key={type.id}
                  label={type.name}
                  count={type.count}
                  isActive={selectedTypes.includes(type.id)}
                  onClick={() => toggleType(type.id)}
                />
              ))}
              {selectedTypes.length > 0 && (
                <CompactFilterButton
                  label="CLEAR ALL"
                  isActive={false}
                  onClick={clearAllFilters}
                />
              )}
            </div>
          </div>
        </div>
      </div>

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
          flex-shrink: 0; /* Prevent cards from shrinking */
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

        .location-type {
          color: var(--nyc-orange);
          font-size: 0.8rem;
          text-transform: uppercase;
        }

        .location-capacity {
          color: var(--terminal-color);
          font-size: 0.8rem;
        }

        .location-name {
          color: var(--nyc-white);
          font-size: 1.1rem;
          margin: 0;
          font-weight: bold;
        }

        .location-address {
          color: var(--nyc-white);
          opacity: 0.8;
          font-size: 0.9rem;
        }

        .location-features {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .feature-tag {
          font-size: 0.7rem;
          padding: 0.25rem 0.5rem;
          background: rgba(0, 255, 255, 0.1);
          border: 1px solid var(--terminal-color);
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
            overflow-y: auto;
          }

          .items-grid {
            max-height: none;
            overflow: visible;
          }

          .map-section {
            height: 300px;
          }

          .filters-section {
            width: 100%;
          }

          .filter-list {
            flex-direction: row;
            flex-wrap: wrap;
            gap: 0.5rem;
          }
        }
      `}</style>
    </main>
  );
} 