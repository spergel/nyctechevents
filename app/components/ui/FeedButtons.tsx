'use client';
import React from 'react';

interface FeedButtonsProps {
  eventId?: string;
  className?: string;
}

export function FeedButtons({ eventId, className = '' }: FeedButtonsProps) {
  const handleRSSClick = () => {
    window.open('/api/rss', '_blank');
  };

  const handleICSClick = () => {
    if (eventId) {
      // Individual event ICS
      window.open(`/api/events/${eventId}/ics`, '_blank');
    } else {
      // All events ICS
      window.open('/api/ics', '_blank');
    }
  };

  return (
    <div className={`feed-buttons ${className}`}>
      <button
        onClick={handleRSSClick}
        className="feed-button rss-button"
        title="Subscribe to RSS feed"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.1V10.1Z"/>
        </svg>
        RSS
      </button>
      
      <button
        onClick={handleICSClick}
        className="feed-button ics-button"
        title={eventId ? "Add this event to calendar" : "Download all events calendar"}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
        </svg>
        {eventId ? 'Add to Calendar' : 'ICS'}
      </button>

      <style jsx>{`
        .feed-buttons {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .feed-button {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.5rem 0.75rem;
          background: rgba(0, 56, 117, 0.3);
          border: 1px solid var(--terminal-color);
          color: var(--terminal-color);
          font-family: var(--font-mono);
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
        }

        .feed-button:hover {
          background: rgba(0, 56, 117, 0.5);
          border-color: var(--nyc-orange);
          color: var(--nyc-orange);
        }

        .rss-button:hover {
          color: #ff6600;
          border-color: #ff6600;
        }

        .ics-button:hover {
          color: #007acc;
          border-color: #007acc;
        }

        @media (max-width: 768px) {
          .feed-buttons {
            flex-direction: column;
            gap: 0.25rem;
          }

          .feed-button {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
} 