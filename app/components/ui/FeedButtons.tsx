'use client';
import React, { useState, useRef } from 'react';

interface FeedButtonsProps {
  eventId?: string;
  eventName?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  location?: string;
  className?: string;
}

export function FeedButtons({ eventId, eventName, startDate, endDate, description, location, className = '' }: FeedButtonsProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleRSSClick = () => {
    window.open('/api/rss', '_blank');
  };

  const handleICSClick = () => {
    if (eventId) {
      window.open(`/api/events/${eventId}/ics`, '_blank');
    } else {
      window.open('/api/ics', '_blank');
    }
  };

  const handleGoogleCalendarClick = () => {
    if (!eventId || !eventName || !startDate) return;
    const start = new Date(startDate).toISOString().replace(/[-:]|\.\d{3}/g, '');
    const end = endDate ? new Date(endDate).toISOString().replace(/[-:]|\.\d{3}/g, '') : start;
    const details = encodeURIComponent(description || '');
    const loc = encodeURIComponent(location || '');
    const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventName)}&dates=${start}/${end}&details=${details}&location=${loc}&sf=true&output=xml`;
    window.open(url, '_blank');
  };

  // Close dropdown on outside click
  React.useEffect(() => {
    if (!dropdownOpen) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

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
      {eventId ? (
        <div className="calendar-dropdown-wrapper" ref={dropdownRef}>
          <button
            className="feed-button ics-button"
            onClick={() => setDropdownOpen((open) => !open)}
            title="Add to Calendar"
            aria-haspopup="listbox"
            aria-expanded={dropdownOpen}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
            </svg>
            Add to Calendar
            <span className="dropdown-arrow">▼</span>
          </button>
          {dropdownOpen && (
            <div className="calendar-dropdown" role="listbox">
              <button className="dropdown-item" onClick={handleGoogleCalendarClick} role="option">
                Add to Google Calendar
              </button>
              <button className="dropdown-item" onClick={handleICSClick} role="option">
                Download ICS
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={handleICSClick}
          className="feed-button ics-button"
          title="Download all events calendar"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
          </svg>
          ICS
        </button>
      )}
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
        .calendar-dropdown-wrapper {
          position: relative;
        }
        .dropdown-arrow {
          margin-left: 0.5em;
          font-size: 0.7em;
        }
        .calendar-dropdown {
          position: absolute;
          top: 110%;
          left: 0;
          min-width: 180px;
          background: #001639;
          border: 1px solid var(--nyc-orange);
          z-index: 10;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          display: flex;
          flex-direction: column;
        }
        .dropdown-item {
          padding: 0.75em 1em;
          background: none;
          border: none;
          color: var(--terminal-color);
          font-family: var(--font-mono);
          font-size: 0.9em;
          text-align: left;
          cursor: pointer;
          transition: background 0.2s, color 0.2s;
        }
        .dropdown-item:hover {
          background: rgba(0, 56, 117, 0.5);
          color: var(--nyc-orange);
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