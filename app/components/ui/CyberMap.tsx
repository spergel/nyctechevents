import React, { useState, useEffect } from 'react';
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

// Debug component to check if the token is available
const TokenDebugger = () => {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    try {
      const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
      if (mapboxToken) {
        // Mask most of the token for security
        const maskedToken = mapboxToken.substring(0, 8) + '...' + mapboxToken.substring(mapboxToken.length - 4);
        setToken(maskedToken);
      } else {
        setToken('Token not found');
      }
    } catch (err) {
      setError(`Error accessing token: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, []);
  
  return (
    <div className="token-debugger">
      <h3>Mapbox Token Status</h3>
      {token && <p>Token: {token}</p>}
      {error && <p className="error">Error: {error}</p>}
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

// Create a client-side only version of the map
const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="map-loading">
      <div className="loading-text">INITIALIZING SCAN</div>
      <div className="loading-dots">...</div>
      <div className="loading-debug">
        <TokenDebugger />
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
  )
});

export function CyberMap(props: CyberMapProps) {
  return <MapComponent {...props} />;
} 