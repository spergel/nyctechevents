import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { DetailDialog } from './DetailDialog';
import { Location } from '@/app/utils/dataHelpers';

interface CyberMapProps {
  locations: Location[];
  selectedTypes: string[];
  onLocationClick?: (location: Location) => void;
}

// Debug component to check if the token is available
const TokenDebugger = () => {
  const [tokenStatus, setTokenStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    try {
      const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
      if (mapboxToken) {
        setTokenStatus('Mapbox token is configured correctly');
      } else {
        setTokenStatus('Token not found in environment variables');
      }
    } catch (err) {
      setError(`Error accessing token: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, []);
  
  return (
    <div className="token-debugger">
      <h3>Mapbox Status</h3>
      {tokenStatus && <p>{tokenStatus}</p>}
      {error && <p className="error">Error: {error}</p>}
      <p>Check your .env file to ensure NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN is set correctly.</p>
      <style jsx>{`
        .token-debugger {
          padding: 1rem;
          background: rgba(0, 0, 0, 0.7);
          border: 1px solid var(--nyc-orange);
          color: var(--terminal-color);
          font-family: var(--font-mono);
          font-size: 0.8rem;
        }
        .error {
          color: #ff4d4d;
        }
      `}</style>
    </div>
  );
};

// Loading component for the map
const MapLoading = () => (
    <div className="map-loading">
      <div className="loading-text">INITIALIZING SCAN</div>
      <div className="loading-dots">...</div>
      <div className="loading-debug">
        {/* Token debugger removed for security */}
      </div>
      <style jsx>{`
        .map-loading {
          width: 100%;
          height: 100%;
          min-height: 400px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(0, 20, 40, 0.3);
          color: var(--terminal-color);
          font-family: var(--font-mono);
        }
        .loading-text {
          font-size: 1rem;
          color: var(--nyc-orange);
          margin-bottom: 0.5rem;
        }
        .loading-dots {
          color: var(--terminal-color);
          animation: blink 1s infinite;
          margin-bottom: 2rem;
        }
        .loading-debug {
          width: 80%;
          max-width: 400px;
        }
        @keyframes blink {
          0% { opacity: 0.2; }
          50% { opacity: 1; }
          100% { opacity: 0.2; }
        }
      `}</style>
    </div>
);

// Create the actual map component with dynamic import
const DynamicMap = dynamic(
  async () => {
    const { default: mapboxgl } = await import('mapbox-gl');
    
    return function MapWithNoSSR({ locations, selectedTypes, onLocationClick }: CyberMapProps) {
      const mapRef = useRef<mapboxgl.Map | null>(null);
      const mapContainer = useRef<HTMLDivElement>(null);
      const markersRef = useRef<mapboxgl.Marker[]>([]);
      const cssLoaded = useRef(false);
      const [mapError, setMapError] = useState<string | null>(null);
    
      useEffect(() => {
        if (typeof window === 'undefined') return;
    
        const initMap = async () => {
          console.log('Initializing map...');
          const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
          
          if (!mapboxToken) {
            console.error('Mapbox token is missing');
            setMapError('Mapbox access token is missing. Please check your .env file.');
            return;
          }
          
          console.log('Mapbox token found');
    
          // Set your Mapbox access token from environment variable
          mapboxgl.accessToken = mapboxToken;
          
          try {
            // Add Mapbox CSS only once
            if (!cssLoaded.current) {
              console.log('Adding Mapbox CSS');
              const link = document.createElement('link');
              link.rel = 'stylesheet';
              link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
              document.head.appendChild(link);
              cssLoaded.current = true;
            }
    
            // Wait for the container to be available
            if (!mapContainer.current) {
              console.error('Map container not found');
              setMapError('Map container not found');
              return;
            }
            
            console.log('Map container found');
    
            // Only initialize map if it hasn't been initialized yet
            if (!mapRef.current) {
              console.log('Creating new map instance');
              // Calculate initial bounds from locations
              const bounds = new mapboxgl.LngLatBounds();
              
              if (locations.length === 0) {
                // Default to NYC bounds if no locations
                bounds.extend([-74.0060, 40.7128]);
              } else {
                locations.forEach(location => {
                  if (location.coordinates) {
                    bounds.extend([location.coordinates.lng, location.coordinates.lat]);
                  }
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
              console.log('Creating map with container:', mapContainer.current);
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
              console.log('Map created:', map);
    
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
                console.log('Map loaded successfully');
                updateMarkers();
                
                // Force a resize to ensure the map fills the container
                setTimeout(() => {
                  if (mapRef.current) {
                    console.log('Resizing map');
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
          
          // Skip locations without coordinates
          if (!location.coordinates) return;

          // Create popup
          const popup = new mapboxgl.Popup({
            offset: 25,
            className: 'cyber-popup',
            closeButton: true,
            maxWidth: '300px'
          }).setHTML(`
            <div class="popup-content">
              <div class="popup-type">${location.type}</div>
              <div class="popup-name">${location.name}</div>
              ${location.address ? `<div class="popup-address">${location.address}</div>` : ''}
              <div class="popup-features">
                ${location.amenities && location.amenities.length > 0 ? 
                  location.amenities.slice(0, 2).map(amenity => 
                    `<span class="popup-feature">${amenity}</span>`
                  ).join('') : ''}
              </div>
              <button class="popup-details-button" id="location-details-${location.id}">VIEW DETAILS</button>
            </div>
          `);
            
          // Create and add the marker
          const marker = new mapboxgl.Marker(markerEl)
            .setLngLat([location.coordinates.lng, location.coordinates.lat])
            .setPopup(popup)
            .addTo(mapRef.current!);
    
          // First click just opens the popup
          markerEl.addEventListener('click', () => {
            marker.togglePopup();
          });
    
          // When the popup is added to the map, add a click event to the details button
          popup.on('open', () => {
            setTimeout(() => {
              const detailsButton = document.getElementById(`location-details-${location.id}`);
              if (detailsButton && onLocationClick) {
                detailsButton.addEventListener('click', (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onLocationClick(location);
                  marker.togglePopup(); // Close the popup after clicking the details button
                });
              }
            }, 10); // Small timeout to ensure DOM is ready
          });
    
          markersRef.current.push(marker);
        });
    
        // Fit map to show all markers
        if (filteredLocations.length > 0) {
          const bounds = new mapboxgl.LngLatBounds();
          filteredLocations.forEach(location => {
            if (location.coordinates) {
              bounds.extend([location.coordinates.lng, location.coordinates.lat]);
            }
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
              <div ref={mapContainer} className="map" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} />
              <div className="scan-overlay" />
              <div className="grid-overlay" />
            </>
          )}
          
          <style jsx global>{`
            /* Map container */
            .cyber-map-container {
              position: relative;
              height: 100%;
              width: 100%;
              background-color: var(--nyc-darkblue);
              overflow: hidden;
            }
            
            /* Map element */
            .map {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              z-index: 1;
            }
            
            /* Overlay elements */
            .scan-overlay {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background: linear-gradient(rgba(0, 56, 117, 0.1) 50%, transparent 50%);
              background-size: 4px 4px;
              pointer-events: none;
              z-index: 2;
              opacity: 0.3;
            }
            
            .grid-overlay {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background: 
                linear-gradient(90deg, rgba(255, 107, 28, 0.1) 1px, transparent 1px),
                linear-gradient(0deg, rgba(255, 107, 28, 0.1) 1px, transparent 1px);
              background-size: 20px 20px;
              pointer-events: none;
              z-index: 2;
              opacity: 0.2;
            }
            
            /* Map error state */
            .map-error {
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              background: rgba(0, 20, 40, 0.7);
              color: var(--nyc-orange);
              font-family: var(--font-mono);
              padding: 2rem;
              text-align: center;
            }
            
            .retry-button {
              margin-top: 1rem;
              padding: 0.5rem 1rem;
              background: rgba(255, 107, 28, 0.2);
              border: 1px solid var(--nyc-orange);
              color: var(--nyc-orange);
              font-family: var(--font-mono);
              cursor: pointer;
              transition: all 0.2s;
            }
            
            .retry-button:hover {
              background: rgba(255, 107, 28, 0.3);
            }
            
            /* Cyber Markers */
            .cyber-marker {
              width: 20px;
              height: 20px;
              cursor: pointer;
            }
            
            .marker-inner {
              width: 100%;
              height: 100%;
              background: var(--nyc-green);
              border: 2px solid var(--nyc-blue);
              border-radius: 50%;
              box-shadow: 0 0 0 2px rgba(var(--nyc-green-rgb), 0.3),
                          0 0 10px rgba(var(--nyc-green-rgb), 0.7);
              transition: all 0.3s;
            }
            
            .cyber-marker:hover .marker-inner {
              background: var(--nyc-orange);
              box-shadow: 0 0 0 3px rgba(var(--nyc-orange-rgb), 0.3),
                          0 0 15px rgba(var(--nyc-orange-rgb), 0.7);
            }
            
            /* Popups styling */
            .mapboxgl-popup-content {
              background: rgba(0, 20, 40, 0.85) !important;
              color: var(--nyc-white);
              backdrop-filter: blur(5px);
              border: 1px solid var(--nyc-blue);
              border-radius: 0 !important;
              box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5), 
                          0 0 0 1px rgba(var(--nyc-green-rgb), 0.3),
                          0 0 20px rgba(var(--nyc-green-rgb), 0.2);
              padding: 0 !important;
              overflow: hidden;
              font-family: var(--font-mono);
            }
            
            .mapboxgl-popup-close-button {
              color: var(--nyc-green);
              font-size: 20px;
              padding: 5px 8px;
              background: rgba(0, 20, 40, 0.7);
              border: none;
              z-index: 10;
              transition: all 0.2s;
            }
            
            .mapboxgl-popup-close-button:hover {
              color: var(--nyc-orange);
              background: rgba(0, 20, 40, 0.9);
            }
            
            .mapboxgl-popup-tip {
              border-top-color: var(--nyc-blue) !important;
              border-bottom-color: var(--nyc-blue) !important;
            }
            
            /* Popup content styling */
            .popup-content {
              padding: 10px;
              max-width: 300px;
              display: flex;
              flex-direction: column;
              gap: 8px;
            }
            
            .popup-type {
              font-size: 0.75rem;
              text-transform: uppercase;
              color: var(--nyc-green);
              letter-spacing: 0.05em;
              padding-bottom: 4px;
              border-bottom: 1px solid rgba(var(--nyc-green-rgb), 0.3);
            }
            
            .popup-name {
              font-size: 1rem;
              font-weight: bold;
              color: var(--nyc-white);
              margin: 4px 0;
            }
            
            .popup-address {
              font-size: 0.85rem;
              color: rgba(255, 255, 255, 0.8);
            }
            
            .popup-capacity {
              font-size: 0.8rem;
              color: var(--terminal-color);
            }
            
            .popup-features {
              display: flex;
              flex-wrap: wrap;
              gap: 6px;
              margin-top: 6px;
            }
            
            .popup-feature {
              font-size: 0.75rem;
              padding: 2px 6px;
              background: rgba(var(--nyc-blue-rgb), 0.3);
              border: 1px solid rgba(var(--nyc-blue-rgb), 0.5);
              color: var(--terminal-color);
            }
            
            .popup-details-button {
              margin-top: 10px;
              padding: 8px 12px;
              background: rgba(var(--nyc-green-rgb), 0.2);
              border: 1px solid var(--nyc-green);
              color: var(--nyc-green);
              font-family: var(--font-mono);
              font-size: 0.8rem;
              cursor: pointer;
              transition: all 0.2s;
              text-align: center;
              align-self: stretch;
            }
            
            .popup-details-button:hover {
              background: rgba(var(--nyc-orange-rgb), 0.2);
              border-color: var(--nyc-orange);
              color: var(--nyc-orange);
            }
            
            /* Map loading state */
            .map-loading {
              width: 100%;
              height: 100%;
              min-height: 400px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              background: rgba(0, 20, 40, 0.3);
              color: var(--terminal-color);
              font-family: var(--font-mono);
            }
            
            .loading-text {
              font-size: 1rem;
              color: var(--nyc-orange);
              margin-bottom: 0.5rem;
            }
            
            .loading-dots {
              color: var(--terminal-color);
              animation: blink 1s infinite;
              margin-bottom: 2rem;
            }
            
            .loading-debug {
              width: 80%;
              max-width: 400px;
            }
            
            @keyframes blink {
              0% { opacity: 0.2; }
              50% { opacity: 1; }
              100% { opacity: 0.2; }
            }
          `}</style>
        </div>
      );
    };
  },
  {
    loading: () => <MapLoading />,
    ssr: false
  }
);

export function CyberMap(props: CyberMapProps) {
  return <DynamicMap {...props} />;
} 