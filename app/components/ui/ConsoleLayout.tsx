'use client';
import React, { useState, useEffect } from 'react';
import { Panel } from './Panel';
import { CyberMap } from './CyberMap';
import { HolographicDisplay } from './HolographicDisplay';
import { DetailDialog } from './DetailDialog';
import substackPosts from '@/public/data/substackposts.json';
import communities from '@/public/data/communities.json';
import locations from '@/public/data/locations.json';
import events from '@/public/data/events.json';
import { Location } from '@/app/utils/dataHelpers';
import { AddToCalendar } from './AddToCalendar';

interface Community {
  id: string;
  name: string;
  // Add other fields as needed
}

interface Substack {
  id: string;
  name: string;
  // Add other fields as needed
}

interface SubstackPost {
  id: string;
  title: string;
  post_date: string;
  publication: string;
  url: string;
}

interface ImportedEvent {
  id: string;
  name: string;
  type: string;
  locationId?: string;
  communityId?: string;
  description: string | null;
  startDate: string;
  endDate?: string | null;
  category?: string[];
  metadata?: any;
}

interface LocationsData {
  locations: Location[];
}

interface CommunitiesData {
  communities: Community[];
}

interface SubstacksData {
  substacks: Substack[];
}

interface SubstackPostsData {
  last_updated: string;
  posts: SubstackPost[];
}

interface EventsData {
  events: ImportedEvent[];
}

interface ConsoleLayoutProps {
  children: React.ReactNode;
  locations: Location[];
  onLocationClick?: (location: Location) => void;
  lastUpdateTime: string;
}

export function ConsoleLayout({ children, locations, onLocationClick, lastUpdateTime }: ConsoleLayoutProps) {
  const [selectedEvent, setSelectedEvent] = useState<ImportedEvent | null>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    // Use fixed formatting that doesn't depend on locale
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    // Format as two lines for better fit
    return (
      <>
        <span className="date-part">{`${month}/${day}/${year}`}</span>
        <span className="time-part">{`${hours}:${minutes}`}</span>
      </>
    );
  };

  // Get the latest 10 posts
  const latestPosts = substackPosts.posts.slice(0, 10);

  return (
    <div className="console-layout">
      <div className="left-column-container">
        <div className="left-top">
          <div className="section-header">
            <h3>ADD TO CALENDAR</h3>
            <span className="system-id">CAL-001</span>
          </div>
          <Panel 
            variant="primary"
            footerStats={{
              left: "SYNC: READY",
              right: "EXPORT: ACTIVE"
            }}
          >
            <AddToCalendar />
          </Panel>
        </div>

        <div className="left-bottom mobile-main">
          <div className="section-header">
            <h3>NYC DIRECTORY</h3>
            <span className="system-id">NYC-001</span>
          </div>
          <Panel 
            variant="primary"
            footerStats={{
              left: "SIGNAL: OK",
              right: "RES: 1920x1080"
            }}
          >
            <div className="retro-overlay">
              <div className="scan-line"></div>
              <div className="glow-effect"></div>
            </div>
            {React.Children.toArray(children).find(child => (child as any)?.props?.systemId === 'NYC-001')}
          </Panel>
        </div>
      </div>

      <div className="center-column">
        <div className="center-content">
          <div className="section-header">
            <h3>LOCATION SCAN</h3>
            <span className="system-id">SCAN-004</span>
          </div>
          <Panel 
            variant="secondary"
            footerStats={{
              left: "SCAN: ACTIVE",
              right: "TARGETS: " + locations.length
            }}
          >
            <div className="map-container">
              <CyberMap
                locations={locations}
                selectedTypes={[]}
                onLocationClick={onLocationClick}
              />
            </div>
          </Panel>
        </div>
        <div className="system-status-container">
          <div className="section-header">
            <h3>SYSTEM STATUS</h3>
            <span className="system-id">SYS-001</span>
          </div>
          <Panel 
            variant="monitor"
            footerStats={{
              left: "MONITORING: ACTIVE",
              right: "ALL SYSTEMS GO"
            }}
          >
            <div className="system-status">
              <div className="status-item">
                <span className="status-label">COMMUNITIES:</span>
                <span className="status-value">{(communities as CommunitiesData).communities.length}</span>
              </div>
              <div className="status-item">
                <span className="status-label">LOCATIONS:</span>
                <span className="status-value">{locations.length}</span>
              </div>
              <div className="status-item">
                <span className="status-label">EVENTS:</span>
                <span className="status-value">{events.events.length}</span>
              </div>
              <div className="status-item">
                <span className="status-label">STACKS:</span>
                <span className="status-value">{(substackPosts as SubstackPostsData).posts.length}</span>
              </div>
              <div className="status-item">
                <span className="status-label">LAST UPDATE:</span>
                <span className="status-value">
                  {lastUpdateTime && lastUpdateTime !== 'N/A' && lastUpdateTime !== 'Error' 
                    ? formatDate(lastUpdateTime) 
                    : lastUpdateTime /* Display N/A or Error directly */}
                </span>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <div className="right-column">
        <div className="right-quick">
          <div className="section-header">
            <h3>QUICK ACCESS</h3>
            <span className="system-id">DIR-001</span>
          </div>
          <Panel 
            variant="primary"
            footerStats={{
              left: "LINKS: 3",
              right: "STATUS: OK"
            }}
          >
            {React.Children.toArray(children).find(child => (child as any)?.props?.systemId === 'DIR-001')}
          </Panel>
        </div>
        <div className="right-data">
          <div className="section-header">
            <h3>DATA FEED</h3>
            <span className="system-id">DATA-003</span>
          </div>
          <Panel 
            variant="primary"
            footerStats={{
              left: "ENTRIES: 24",
              right: "UPDATED: LIVE"
            }}
          >
            {React.Children.toArray(children).find(child => (child as any)?.props?.systemId === 'DATA-003')}
          </Panel>
        </div>
      </div>

      {/* Event Detail Dialog */}
      <DetailDialog
        title={selectedEvent?.name || ''}
        systemId="EVT-DTL-002"
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
      >
        {selectedEvent && (
          <div className="event-detail">
            <div className="detail-section">
              <h3>DATE & TIME</h3>
              <p>{new Date(selectedEvent.startDate).toLocaleString()}</p>
              {selectedEvent.endDate && (
                <p>Until: {new Date(selectedEvent.endDate).toLocaleString()}</p>
              )}
            </div>

            {selectedEvent.description && (
              <div className="detail-section">
                <h3>DESCRIPTION</h3>
                <p className="event-description">{selectedEvent.description}</p>
              </div>
            )}

            {selectedEvent.category && (
              <div className="detail-section">
                <h3>CATEGORIES</h3>
                <div className="detail-categories">
                  {selectedEvent.category.map((cat, i) => (
                    <span key={i} className="category-tag">{cat}</span>
                  ))}
                </div>
              </div>
            )}

            {selectedEvent.metadata && (
              <div className="detail-section">
                <h3>ADDITIONAL INFO</h3>
                <pre className="metadata">
                  {JSON.stringify(selectedEvent.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </DetailDialog>

      <style jsx>{`
        .console-layout {
          display: grid;
          grid-template-columns: minmax(300px, 1.2fr) minmax(0, 2.5fr) minmax(300px, 1.2fr);
          gap: 0;
          padding: 0.25rem;
          height: calc(100vh - 4rem);
          width: 100%;
          background: var(--background);
        }

        .left-column-container, .right-column, .center-column {
          height: 100%;
          display: flex;
          flex-direction: column;
          gap: 0;
          overflow: hidden;
        }

        .center-column {
          max-width: 800px;
          justify-self: center;
          width: 100%;
        }

        .center-content {
          flex: 1;
          min-height: 0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 0;
          margin-bottom: -1px;
        }

        .system-status-container {
          height: 200px;
          min-height: 200px;
          margin: 0;
          display: flex;
          flex-direction: column;
        }

        .system-status {
          display: flex;
          flex-direction: row;
          gap: 0.5rem;
          padding: 0.25rem;
          height: calc(100% - 2.5rem);
          margin-top: -1px;
        }

        .status-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 0.25rem;
          padding: 0.75rem;
          background: rgba(0, 20, 40, 0.5);
          border: 1px solid var(--nyc-orange);
          text-align: center;
          min-width: 60px;
          min-height: 70px;
          overflow: hidden;
        }

        .status-item:last-child {
          padding-left: 0.5rem;
          padding-right: 0.5rem;
        }

        .status-label {
          color: var(--terminal-color);
          font-family: var(--font-mono);
          font-size: 0.8rem;
          line-height: 1;
          text-transform: uppercase;
          margin-bottom: 0.25rem;
        }

        .status-value {
          color: var(--nyc-orange);
          font-family: var(--font-mono);
          font-weight: bold;
          font-size: 1.2rem;
          line-height: 1.1;
          word-break: break-word;
          text-align: center;
          width: 100%;
        }

        .status-item:last-child .status-value {
          font-size: 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
        }

        .date-part {
          white-space: nowrap;
          display: block;
        }

        .time-part {
          white-space: nowrap;
          display: block;
          font-size: 0.9em;
          opacity: 0.8;
        }

        .map-container {
          flex: 1;
          min-height: 0;
          max-height: 350px;
          background: rgba(0, 20, 40, 0.3);
          border-radius: 4px;
          overflow: hidden;
        }

        .left-top {
          height: 45%;
          min-height: 0;
          margin-bottom: -1px;
        }

        .left-bottom {
          flex: 1;
          min-height: 0;
        }

        .right-quick {
          height: 30%;
          min-height: 0;
          margin-bottom: -1px;
        }

        .right-data {
          height: 70%;
          min-height: 0;
        }

        .right-info {
          display: none;
        }

        .skyline-display {
          width: 100%;
          height: 100%;
          object-fit: cover;
          overflow: hidden;
        }

        .section-header {
          padding: 0.5rem;
          background: linear-gradient(90deg, var(--nyc-blue), var(--background));
          border: 1px solid var(--nyc-orange);
          border-bottom: none;
          display: flex;
          justify-content: space-between;
          align-items: center;
          min-height: 2.5rem;
          margin-bottom: -1px;
          z-index: 1;
        }

        .section-header h3 {
          color: var(--nyc-orange);
          font-family: var(--font-display);
          font-size: 1.1rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin: 0;
        }

        .system-id {
          color: var(--terminal-color);
          font-family: var(--font-mono);
          font-size: 0.8rem;
          opacity: 0.8;
        }

        .left-top, .left-bottom, .right-quick, .right-data, .right-info {
          display: flex;
          flex-direction: column;
        }

        .news-container {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        .news-hologram {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
          opacity: 0.4;
          pointer-events: none;
        }

        .news-feed {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          height: 100%;
          padding: 0.5rem;
          overflow-y: auto;
          overflow-x: hidden;
          background: rgba(0, 20, 40, 0.5);
          backdrop-filter: blur(2px);
          border: 1px solid var(--nyc-orange);
          scrollbar-width: thin;
          scrollbar-color: var(--nyc-orange) rgba(0, 20, 40, 0.3);
        }

        .news-feed::-webkit-scrollbar {
          width: 6px;
        }

        .news-feed::-webkit-scrollbar-track {
          background: rgba(0, 20, 40, 0.3);
        }

        .news-feed::-webkit-scrollbar-thumb {
          background-color: var(--nyc-orange);
          border-radius: 3px;
        }

        .news-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 0.75rem;
          margin-bottom: 0.5rem;
          background: rgba(0, 20, 40, 0.3);
          border: 1px solid var(--terminal-color);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .twitter-link {
          border: 1px solid #1d9bf0;
          background: rgba(29, 155, 240, 0.1);
          padding: 1rem;
          transition: all 0.3s ease;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          position: relative;
          overflow: hidden;
        }
        
        .twitter-link:hover {
          border-color: #1d9bf0;
          background: rgba(29, 155, 240, 0.2);
          box-shadow: 0 0 15px rgba(29, 155, 240, 0.4), inset 0 0 8px rgba(29, 155, 240, 0.2);
          transform: translateY(-2px) scale(1.02);
        }
        
        .twitter-link::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, rgba(29, 155, 240, 0.1) 0%, transparent 50%);
          pointer-events: none;
        }
        
        .twitter-glitch-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          overflow: hidden;
          z-index: 0;
        }
        
        .twitter-scanline {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 1px;
          background: rgba(29, 155, 240, 0.5);
          box-shadow: 0 0 8px rgba(29, 155, 240, 0.8);
          animation: twitter-scanline 3s linear infinite;
          opacity: 0;
          transition: opacity 0.3s ease;
          z-index: 1;
        }
        
        .twitter-link:hover .twitter-scanline {
          opacity: 0.7;
        }
        
        @keyframes twitter-scanline {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(100px);
          }
        }
        
        .twitter-glitch {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, 
            transparent 0%, 
            rgba(29, 155, 240, 0.05) 45%, 
            rgba(29, 155, 240, 0.1) 50%, 
            rgba(29, 155, 240, 0.05) 55%, 
            transparent 100%);
          opacity: 0;
          animation: twitter-glitch 3s ease-in-out infinite;
          z-index: 1;
        }
        
        .twitter-link:hover .twitter-glitch {
          opacity: 1;
        }
        
        @keyframes twitter-glitch {
          0%, 100% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(100%);
          }
        }
        
        .twitter-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: rgba(29, 155, 240, 0.15);
          border-radius: 50%;
          padding: 8px;
          border: 1px solid rgba(29, 155, 240, 0.5);
          box-shadow: 0 0 10px rgba(29, 155, 240, 0.3);
          position: relative;
          z-index: 2;
          animation: twitter-icon-pulse 4s infinite ease-in-out;
        }
        
        @keyframes twitter-icon-pulse {
          0%, 100% {
            box-shadow: 0 0 10px rgba(29, 155, 240, 0.3);
          }
          50% {
            box-shadow: 0 0 15px rgba(29, 155, 240, 0.6);
          }
        }
        
        .twitter-icon::after {
          content: "";
          position: absolute;
          top: -3px;
          left: -3px;
          right: -3px;
          bottom: -3px;
          border-radius: 50%;
          border: 1px solid rgba(29, 155, 240, 0.3);
          animation: twitter-icon-ring 3s infinite ease-in-out;
        }
        
        @keyframes twitter-icon-ring {
          0% {
            transform: scale(1);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.2;
          }
          100% {
            transform: scale(1);
            opacity: 0.5;
          }
        }
        
        .twitter-icon svg {
          filter: drop-shadow(0 0 2px rgba(29, 155, 240, 0.8));
        }
        
        .twitter-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          z-index: 2;
        }
        
        .twitter-chevron {
          opacity: 0.7;
          transition: all 0.3s ease;
          z-index: 2;
        }
        
        .twitter-link:hover .twitter-chevron {
          opacity: 1;
          transform: translateX(3px);
        }
        
        .link-action {
          color: #1d9bf0;
          font-family: var(--font-mono);
          font-size: 0.7rem;
          letter-spacing: 1.5px;
          text-shadow: 0 0 5px rgba(29, 155, 240, 0.5);
          background: rgba(29, 155, 240, 0.1);
          padding: 0.1rem 0.3rem;
          border-radius: 2px;
          display: inline-block;
          width: fit-content;
          margin-bottom: 0.1rem;
        }
        
        .link-title {
          color: var(--nyc-white);
          font-size: 1.15rem;
          font-weight: bold;
          letter-spacing: 0.5px;
          text-shadow: 0 0 5px rgba(255, 255, 255, 0.3);
          margin-bottom: 0.1rem;
        }
        
        .link-source {
          color: var(--terminal-color);
          font-size: 0.8rem;
          opacity: 0.85;
          letter-spacing: 0.3px;
        }

        .news-date {
          color: var(--terminal-color);
          font-family: var(--font-mono);
          font-size: 0.8rem;
          white-space: nowrap;
          opacity: 0.8;
          padding-top: 0.25rem;
          text-shadow: 0 0 8px var(--terminal-color);
          position: relative;
        }

        .news-content {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          overflow: hidden;
          width: 100%;
        }

        .news-content h4 {
          color: var(--terminal-color);
          margin: 0;
          font-family: var(--font-display);
          font-size: 1rem;
          line-height: 1.4;
          text-shadow: 0 0 8px var(--terminal-color);
          position: relative;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .news-source {
          color: var(--nyc-orange);
          font-family: var(--font-mono);
          font-size: 0.8rem;
          opacity: 0.8;
          text-shadow: 0 0 8px var(--nyc-orange);
          position: relative;
          margin-top: auto;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Modify data feed and info feed hover behavior */
        .right-data :global(.news-item),
        .right-info :global(.news-item) {
          transform: none !important;
          transition: background-color 0.2s ease, border-color 0.2s ease;
        }

        .right-data :global(.news-item:hover),
        .right-info :global(.news-item:hover) {
          transform: none !important;
          background: rgba(0, 20, 40, 0.9);
          border-color: var(--terminal-color);
        }

        @media (max-width: 1200px) {
          .console-layout {
            grid-template-columns: 1fr;
            grid-template-rows: auto;
            height: auto;
            max-height: none;
            padding: 0;
            gap: 0;
          }

          .left-column-container {
            display: flex;
            flex-direction: column;
          }

          .left-top,
          .center-column,
          .right-column {
            display: none;
          }

          .mobile-main {
            height: calc(100vh - 4rem);
            margin: 0;
          }

          .left-bottom {
            flex: none;
            height: calc(100vh - 4rem);
            position: relative;
          }

          .section-header {
            background: linear-gradient(90deg, var(--nyc-blue), var(--background));
            border-left: none;
            border-right: none;
          }

          .section-header h3 {
            font-size: 1.2rem;
            text-shadow: 0 0 10px var(--nyc-orange);
          }

          :global(.console-module) {
            border-left: none;
            border-right: none;
            border-radius: 0;
          }

          :global(.console-module-content) {
            background: rgba(0, 20, 40, 0.8);
          }

          .map-container {
            height: 300px;
          }
        }

        @media (max-width: 480px) {
          .section-header h3 {
            font-size: 1rem;
          }

          .system-id {
            font-size: 0.7rem;
          }

          .map-container {
            height: 250px;
          }
        }

        .retro-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: 10;
          overflow: hidden;
        }

        .scan-line {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: rgba(255, 107, 28, 0.1);
          animation: scanline 6s linear infinite;
          box-shadow: 0 0 20px rgba(255, 107, 28, 0.3);
        }

        .glow-effect {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(
            circle at 50% 50%,
            rgba(0, 56, 117, 0.1) 0%,
            rgba(0, 56, 117, 0) 70%
          );
          animation: pulse 4s ease-in-out infinite;
        }

        @keyframes scanline {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(100vh);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.6;
          }
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

        .detail-categories {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .category-tag {
          font-size: 0.8rem;
          padding: 0.25rem 0.5rem;
          background: rgba(0, 255, 255, 0.1);
          border: 1px solid var(--terminal-color);
          color: var(--terminal-color);
        }

        .metadata {
          font-family: var(--font-mono);
          font-size: 0.8rem;
          color: var(--nyc-white);
          background: rgba(0, 20, 40, 0.3);
          padding: 1rem;
          border: 1px solid var(--nyc-orange);
          white-space: pre-wrap;
          overflow-x: auto;
        }
      `}</style>
    </div>
  );
}