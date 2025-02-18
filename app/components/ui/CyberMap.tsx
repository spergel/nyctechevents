import React from 'react';
import dynamic from 'next/dynamic';

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

interface CyberMapProps {
  locations: Location[];
  selectedTypes: string[];
  onLocationClick?: (location: Location) => void;
}

// Create a client-side only version of the map
const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="map-loading">
      <div className="loading-text">INITIALIZING SCAN</div>
      <div className="loading-dots">...</div>
      <style jsx>{`
        .map-loading {
          width: 100%;
          height: 100%;
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
        }
        .loading-dots {
          color: var(--terminal-color);
          animation: blink 1s infinite;
        }
        @keyframes blink {
          0% { opacity: 0.2; }
          50% { opacity: 1; }
          100% { opacity: 0.2; }
        }
      `}</style>
    </div>
  )
});

export function CyberMap(props: CyberMapProps) {
  return <MapComponent {...props} />;
} 