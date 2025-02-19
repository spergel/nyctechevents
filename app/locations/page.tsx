'use client';
import React, { useState, useEffect } from 'react';
import locations from '@/public/data/locations.json';
import { Panel } from '@/app/components/ui/Panel';
import { CyberMap } from '@/app/components/ui/CyberMap';
import Loading from '@/app/loading';
import { ConsoleModule } from '@/app/components/ui/ConsoleModule';
import { CompactFilterButton } from '@/app/components/ui/CompactFilterButton';

export default function Locations() {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

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

  const locationStats = [
    { label: 'TOTAL', value: locations.locations.length, color: 'var(--terminal-color)' },
    { label: 'ACCESSIBLE', value: locations.locations.filter(l => l.accessibility).length / locations.locations.length * 100, color: 'var(--nyc-orange)' },
  ];

  const locationTypes = Array.from(new Set(locations.locations.map(l => l.type)));

  const filteredLocations = locations.locations.filter(location =>
    selectedTypes.length === 0 || selectedTypes.includes(location.type)
  );

  const toggleType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  // Generate random points for the radar visualization
  const radarPoints = filteredLocations.slice(0, 5).map((_, index) => ({
    x: 20 + (index * 15),
    y: 30 + (index * 12),
  }));

  if (isLoading) {
    return <Loading />;
  }

  return (
    <main className="locations-page">
      <div className="locations-layout">
        <div className="main-section">
          <Panel title="NYC LOCATIONS DIRECTORY" systemId="LOC-001">
            <div className="locations-grid">
              {filteredLocations.map((location) => (
                <a key={location.id} href={`/locations/${location.id}`} className="location-card">
                  <div className="location-header">
                    <span className="location-type">{location.type}</span>
                    <span className="location-capacity">CAP: {location.capacity || 'N/A'}</span>
                  </div>
                  <div className="location-name">{location.name}</div>
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

        <div className="side-section">
          <div className="filters-container">
            <ConsoleModule variant="secondary">
              <div className="filters-content">
                <div className="type-list">
                  {locationTypes.map((type) => (
                    <CompactFilterButton
                      key={type}
                      label={type}
                      count={locations.locations.filter(l => l.type === type).length}
                      isActive={selectedTypes.includes(type)}
                      onClick={() => toggleType(type)}
                    />
                  ))}
                </div>
              </div>
            </ConsoleModule>
          </div>

          <div className="map-container">
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
        </div>
      </div>

      <style jsx>{`
        .locations-page {
          width: 100%;
          height: 100%;
        }

        .locations-layout {
          display: grid;
          grid-template-columns: 300px 1fr;
          gap: 0;
          height: 100%;
          padding: 0;
        }

        .locations-grid {
          display: flex;
          flex-direction: column;
          gap: 0;
          padding: 0;
          overflow-y: auto;
          max-height: calc(100vh - 100px);
        }

        .side-section {
          display: flex;
          flex-direction: column;
          gap: 0;
          height: 100%;
        }

        .filters-container {
          height: auto;
          min-height: 80px;
          max-height: 120px;
          margin-bottom: -1px;
        }

        .filters-content {
          padding: 0.5rem;
          height: 100%;
          overflow-y: auto;
        }

        .map-container {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
        }

        .map-content {
          flex: 1;
          min-height: 0;
          background: rgba(0, 20, 40, 0.3);
          border-radius: 4px;
          overflow: hidden;
        }

        .location-card {
          display: flex;
          flex-direction: column;
          padding: 1rem;
          background: rgba(0, 56, 117, 0.3);
          border: 1px solid transparent;
          text-decoration: none;
          color: var(--nyc-white);
          transition: all 0.2s ease;
          margin-bottom: -1px;
        }

        .location-card:hover {
          border-color: var(--nyc-orange);
          background: rgba(0, 56, 117, 0.5);
          transform: translateX(4px);
          box-shadow: 0 4px 12px rgba(255, 107, 28, 0.2);
        }

        .location-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }

        .location-type {
          color: var(--terminal-color);
          font-family: var(--font-mono);
          font-size: 0.8rem;
        }

        .location-capacity {
          color: var(--nyc-orange);
          font-family: var(--font-mono);
          font-size: 0.8rem;
        }

        .location-name {
          font-family: var(--font-display);
          font-size: 1.1rem;
          margin-bottom: 0.5rem;
          line-height: 1.2;
        }

        .location-address {
          font-family: var(--font-mono);
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 0.5rem;
          line-height: 1.2;
        }

        .location-features {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: auto;
        }

        .feature-tag {
          font-size: 0.7rem;
          padding: 0.2rem 0.5rem;
          background: rgba(0, 255, 255, 0.1);
          border: 1px solid var(--terminal-color);
          color: var(--terminal-color);
          font-family: var(--font-mono);
          white-space: nowrap;
        }

        @media (max-width: 1024px) {
          .locations-layout {
            grid-template-columns: 1fr;
            grid-template-rows: auto 1fr;
            gap: 1rem;
            padding: 1rem;
          }

          .locations-grid {
            gap: 1rem;
            padding: 1rem;
          }

          .location-card {
            margin-bottom: 0;
          }
        }

        @media (max-width: 768px) {
          .locations-grid {
            padding: 0.5rem;
          }

          .location-card {
            padding: 0.75rem;
          }
        }

        @media (max-width: 480px) {
          .locations-layout {
            padding: 0.5rem;
            gap: 0.5rem;
          }

          .location-card {
            padding: 0.5rem;
          }

          .location-name {
            font-size: 1rem;
          }

          .location-address {
            font-size: 0.75rem;
          }

          .map-container {
            min-height: 250px;
          }
        }
      `}</style>
    </main>
  );
} 