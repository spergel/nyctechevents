import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';

interface Location {
  id: string;
  name: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  type: string;
  address?: string;
  amenities?: string[];
  capacity?: string | number;
  accessibility?: boolean;
}

interface MapComponentProps {
  locations: Location[];
  selectedTypes: string[];
  onLocationClick?: (location: Location) => void;
}

const MapComponent = ({ locations, selectedTypes, onLocationClick }: MapComponentProps) => {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const cssLoaded = useRef(false);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initMap = async () => {
      const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
      
      if (!mapboxToken) {
        setMapError('Mapbox access token is missing');
        return;
      }

      // Set your Mapbox access token from environment variable
      mapboxgl.accessToken = mapboxToken;
      
      try {
        // Add Mapbox CSS only once
        if (!cssLoaded.current) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
          document.head.appendChild(link);
          cssLoaded.current = true;
        }

        // Wait for the container to be available
        if (!mapContainer.current) {
          setMapError('Map container not found');
          return;
        }

        // Only initialize map if it hasn't been initialized yet
        if (!mapRef.current) {
          // Calculate initial bounds from locations
          const bounds = new mapboxgl.LngLatBounds();
          
          if (locations.length === 0) {
            // Default to NYC bounds if no locations
            bounds.extend([-74.0060, 40.7128]);
          } else {
            locations.forEach(location => {
              bounds.extend([location.coordinates.lng, location.coordinates.lat]);
            });
          }

          // Add different padding for longitude and latitude
          const lngPadding = 0.3;
          const latPadding = 0.1;
          const ne = bounds.getNorthEast();
          const sw = bounds.getSouthWest();
          const maxBounds = new mapboxgl.LngLatBounds(
            [sw.lng - lngPadding, sw.lat - latPadding],
            [ne.lng + lngPadding, ne.lat + latPadding]
          );

          // Create the map
          mapRef.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/dark-v11',
            center: [-74.0060, 40.7128],
            zoom: 11,
            attributionControl: false,
            preserveDrawingBuffer: true,
            maxBounds: maxBounds,
            minZoom: 9
          });

          const map = mapRef.current;

          // Add error handling for map load
          map.on('error', (e) => {
            setMapError(`Map error: ${e.error?.message || 'Unknown error'}`);
          });

          // Add zoom controls
          map.addControl(new mapboxgl.NavigationControl({
            showCompass: false
          }), 'top-right');

          // Wait for map to load before adding markers
          map.on('load', () => {
            updateMarkers();
            
            // Force a resize to ensure the map fills the container
            setTimeout(() => {
              if (mapRef.current) {
                mapRef.current.resize();
              }
            }, 100);
          });
          
          // Add a window resize handler as a fallback
          const handleResize = () => {
            if (mapRef.current) {
              mapRef.current.resize();
            }
          };
          
          window.addEventListener('resize', handleResize);
          
          return () => {
            window.removeEventListener('resize', handleResize);
          };
        }
      } catch (error) {
        setMapError('Error initializing map');
      }
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const updateMarkers = () => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Filter locations based on selected types
    const filteredLocations = locations.filter(
      location => selectedTypes.length === 0 || selectedTypes.includes(location.type)
    );

    // Add new markers
    filteredLocations.forEach(location => {
      // Create marker element
      const markerEl = document.createElement('div');
      markerEl.className = 'cyber-marker';
      markerEl.innerHTML = '<div class="marker-inner"></div>';

      // Create popup
      const popup = new mapboxgl.Popup({
        offset: 25,
        className: 'cyber-popup'
      }).setHTML(`
        <div class="popup-content">
          <div class="popup-type">${location.type}</div>
          <div class="popup-name">${location.name}</div>
          ${location.address ? `<div class="popup-address">${location.address}</div>` : ''}
          ${location.capacity ? `<div class="popup-capacity">Capacity: ${location.capacity}</div>` : ''}
          <div class="popup-features">
            ${location.accessibility ? '<span class="popup-feature">♿ Accessible</span>' : ''}
            ${location.amenities?.slice(0, 2).map(amenity => 
              `<span class="popup-feature">${amenity}</span>`
            ).join('')}
          </div>
          <button class="popup-button" onclick="window.location.href='/locations/${location.id}'">VIEW DETAILS</button>
        </div>
      `);

      // Create and add the marker
      const marker = new mapboxgl.Marker(markerEl)
        .setLngLat([location.coordinates.lng, location.coordinates.lat])
        .setPopup(popup)
        .addTo(mapRef.current!);

      if (onLocationClick) {
        markerEl.addEventListener('click', () => {
          // Instead of navigating, just ensure the popup is shown
          marker.togglePopup();
        });
      }

      markersRef.current.push(marker);
    });

    // Fit map to show all markers
    if (filteredLocations.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      filteredLocations.forEach(location => {
        bounds.extend([location.coordinates.lng, location.coordinates.lat]);
      });
      mapRef.current.fitBounds(bounds, { padding: 50 });
    }
  };

  // Update markers when locations or selectedTypes change
  useEffect(() => {
    if (mapRef.current) {
      updateMarkers();
    }
  }, [locations, selectedTypes]);

  return (
    <div className="cyber-map-container">
      {mapError ? (
        <div className="map-error">
          <p>{mapError}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="retry-button"
          >
            RETRY
          </button>
        </div>
      ) : (
        <>
          <div ref={mapContainer} className="map" />
          <div className="scan-overlay" />
          <div className="grid-overlay" />
        </>
      )}
      
      <style jsx>{`
        .cyber-map-container {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 400px;
          border-radius: 4px;
          overflow: hidden;
          background: var(--panel-bg);
          border: 1px solid var(--nyc-orange);
          box-shadow: 0 0 10px rgba(255, 128, 0, 0.2),
                     inset 0 0 10px rgba(255, 128, 0, 0.1);
        }

        .map-error {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: var(--nyc-orange);
          text-align: center;
          font-family: var(--font-mono);
          padding: 1rem;
          background: rgba(0, 0, 0, 0.8);
          border: 1px solid var(--nyc-orange);
          border-radius: 4px;
          width: 80%;
          max-width: 400px;
        }
        
        .retry-button {
          margin-top: 1rem;
          padding: 0.5rem 1rem;
          background: rgba(0, 56, 117, 0.5);
          border: 1px solid var(--nyc-orange);
          color: var(--nyc-orange);
          font-family: var(--font-mono);
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .retry-button:hover {
          background: rgba(0, 56, 117, 0.7);
          color: var(--nyc-white);
        }

        .map {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .scan-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            180deg,
            transparent 0%,
            rgba(0, 255, 255, 0.1) 50%,
            transparent 100%
          );
          pointer-events: none;
          animation: scan 4s linear infinite;
          z-index: 2;
        }

        .grid-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            linear-gradient(90deg, transparent 50%, rgba(0, 255, 255, 0.1) 50%),
            linear-gradient(0deg, transparent 50%, rgba(0, 255, 255, 0.1) 50%);
          background-size: 40px 40px;
          pointer-events: none;
          opacity: 0.3;
          z-index: 2;
        }

        @keyframes scan {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(100%);
          }
        }

        :global(.cyber-marker) {
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        :global(.cyber-marker .marker-inner) {
          width: 16px;
          height: 16px;
          background: var(--terminal-color);
          border: 2px solid var(--nyc-orange);
          border-radius: 50%;
          box-shadow: 0 0 8px var(--terminal-color);
          transition: all 0.2s ease;
        }

        :global(.cyber-marker:hover .marker-inner) {
          transform: scale(1.2);
          box-shadow: 0 0 12px var(--nyc-orange);
        }

        :global(.cyber-popup) {
          background: var(--panel-bg) !important;
          border: 1px solid var(--nyc-orange) !important;
          border-radius: 4px !important;
          font-family: var(--font-mono) !important;
          max-width: 300px !important;
        }

        :global(.popup-content) {
          padding: 1rem;
          color: var(--terminal-color);
        }

        :global(.popup-type) {
          color: var(--nyc-orange);
          font-size: 0.8rem;
          text-transform: uppercase;
          margin-bottom: 0.5rem;
        }

        :global(.popup-name) {
          font-size: 1.1rem;
          font-weight: bold;
          margin-bottom: 0.5rem;
          color: var(--nyc-white);
        }

        :global(.popup-address) {
          font-size: 0.8rem;
          color: var(--nyc-white);
          opacity: 0.8;
          margin-bottom: 0.5rem;
        }

        :global(.popup-capacity) {
          font-size: 0.8rem;
          color: var(--nyc-white);
          opacity: 0.8;
          margin-bottom: 0.5rem;
        }

        :global(.popup-features) {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          margin-bottom: 0.75rem;
        }

        :global(.popup-feature) {
          font-size: 0.7rem;
          padding: 0.125rem 0.25rem;
          background: rgba(0, 255, 255, 0.1);
          border: 1px solid var(--terminal-color);
          border-radius: 2px;
          color: var(--terminal-color);
        }

        :global(.popup-button) {
          width: 100%;
          padding: 0.5rem;
          background: rgba(0, 56, 117, 0.5);
          border: 1px solid var(--nyc-orange);
          color: var(--nyc-orange);
          font-family: var(--font-mono);
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s ease;
          text-transform: uppercase;
        }

        :global(.popup-button:hover) {
          background: var(--nyc-orange);
          color: var(--nyc-white);
        }

        :global(.mapboxgl-ctrl-top-right) {
          margin-top: 0.5rem;
          margin-right: 0.5rem;
        }

        :global(.mapboxgl-ctrl-group) {
          background: var(--panel-bg) !important;
          border: 1px solid var(--nyc-orange) !important;
        }

        :global(.mapboxgl-ctrl-group button) {
          background: transparent !important;
          border: none !important;
          color: var(--nyc-orange) !important;
        }

        :global(.mapboxgl-ctrl-group button:hover) {
          background: rgba(0, 255, 255, 0.1) !important;
        }

        :global(.mapboxgl-popup-content) {
          background: var(--panel-bg) !important;
          color: var(--terminal-color) !important;
          border: 1px solid var(--nyc-orange) !important;
          border-radius: 4px !important;
          padding: 0 !important;
        }

        :global(.mapboxgl-popup-close-button) {
          color: var(--nyc-orange) !important;
          font-size: 1.2rem !important;
          padding: 0.25rem 0.5rem !important;
        }

        :global(.mapboxgl-popup-close-button:hover) {
          background: rgba(0, 255, 255, 0.1) !important;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .cyber-map-container {
            min-height: 350px;
          }
        }
      `}</style>
    </div>
  );
};

export default MapComponent; 