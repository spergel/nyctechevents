'use client';
import React, { useState, useMemo } from 'react';
import events from '@/public/data/events.json';
import { HolographicDisplay } from './HolographicDisplay';

interface Event {
  id: string;
  name: string;
  startDate: string;
  endDate?: string;
  type: string;
  description?: string;
  venue?: {
    name: string;
    address: string;
  };
  communityId?: string;
}

export function AddToCalendar() {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'week' | 'month' | 'all'>('week');

  // Get upcoming events within the selected time range
  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let endDate = new Date(today);
    switch (selectedTimeRange) {
      case 'week':
        endDate.setDate(endDate.getDate() + 7);
        break;
      case 'month':
        endDate.setDate(endDate.getDate() + 30);
        break;
      case 'all':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
    }

    return (events.events as Event[])
      .filter((event: Event) => {
        if (!event.startDate) return false;
        const eventDate = new Date(event.startDate);
        return eventDate >= today && eventDate <= endDate;
      })
      .sort((a: Event, b: Event) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [selectedTimeRange]);

  // Filter events based on selected types
  const filteredEvents = useMemo(() => {
    if (selectedTypes.length === 0) return upcomingEvents;
    return upcomingEvents.filter(event => selectedTypes.includes(event.type));
  }, [upcomingEvents, selectedTypes]);

  // Get unique event types
  const eventTypes = useMemo(() => {
    const types = new Set<string>();
    upcomingEvents.forEach(event => {
      if (event.type) types.add(event.type);
    });
    return Array.from(types).sort();
  }, [upcomingEvents]);

  const generateICSContent = (events: Event[]): string => {
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//NYC Events//Event Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH`;

    events.forEach(event => {
      const startDate = new Date(event.startDate);
      const endDate = event.endDate ? new Date(event.endDate) : new Date(startDate.getTime() + 60 * 60 * 1000);
      const location = event.venue ? `${event.venue.name}, ${event.venue.address}` : '';
      
      icsContent += `
BEGIN:VEVENT
UID:${event.id}@nycevents.vercel.app
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${event.name}
DESCRIPTION:${(event.description || '').replace(/\n/g, '\\n')}
LOCATION:${location}
CATEGORIES:${event.type}
STATUS:CONFIRMED
END:VEVENT`;
    });

    icsContent += `
END:VCALENDAR`;

    return icsContent;
  };

  const downloadCalendar = () => {
    const icsContent = generateICSContent(filteredEvents);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const typeText = selectedTypes.length > 0 ? `_${selectedTypes.join('_')}` : '';
    const timeText = selectedTimeRange !== 'week' ? `_${selectedTimeRange}` : '';
    link.download = `nyc_events${typeText}${timeText}.ics`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const generateGoogleCalendarUrl = () => {
    if (filteredEvents.length === 0) return '#';
    
    // For multiple events, we'll use a generic calendar creation URL
    const baseUrl = 'https://calendar.google.com/calendar/render';
    const params = new URLSearchParams({
      cid: 'nycevents@example.com', // This would be a real calendar ID in production
      tab: 'weekly'
    });
    
    return `${baseUrl}?${params.toString()}`;
  };

  const toggleType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  return (
    <div className="add-to-calendar">
      <div className="calendar-hologram">
        <HolographicDisplay>
          <div className="hologram-calendar">
            <div className="calendar-icon">📅</div>
            <div className="event-count">{filteredEvents.length}</div>
            <div className="event-label">EVENTS</div>
          </div>
        </HolographicDisplay>
      </div>
      
      <div className="calendar-controls">
        {/* Time Range Selector */}
        <div className="control-group">
          <div className="control-label">TIME RANGE</div>
          <div className="time-range-buttons">
            {[
              { key: 'week' as const, label: '7D' },
              { key: 'month' as const, label: '30D' },
              { key: 'all' as const, label: 'ALL' }
            ].map(({ key, label }) => (
              <button
                key={key}
                className={`time-button ${selectedTimeRange === key ? 'active' : ''}`}
                onClick={() => setSelectedTimeRange(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Event Type Selector */}
        {eventTypes.length > 0 && (
          <div className="control-group">
            <div className="control-label">FILTER BY TYPE</div>
            <div className="type-selector">
              {eventTypes.slice(0, 4).map(type => (
                <button
                  key={type}
                  className={`type-button ${selectedTypes.includes(type) ? 'active' : ''}`}
                  onClick={() => toggleType(type)}
                >
                  {type}
                </button>
              ))}
              {eventTypes.length > 4 && (
                <div className="more-types">+{eventTypes.length - 4} more</div>
              )}
            </div>
          </div>
        )}

        {/* Export Buttons */}
        <div className="control-group">
          <div className="control-label">EXPORT CALENDAR</div>
          <div className="export-buttons">
            <button
              className="export-button ics"
              onClick={downloadCalendar}
              disabled={filteredEvents.length === 0}
            >
              <span className="export-icon">⬇</span>
              <span>Download .ics</span>
            </button>
            <a
              href={generateGoogleCalendarUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className={`export-button google ${filteredEvents.length === 0 ? 'disabled' : ''}`}
            >
              <span className="export-icon">↗</span>
              <span>Google Cal</span>
            </a>
          </div>
        </div>
      </div>

      <style jsx>{`
        .add-to-calendar {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          height: 100%;
        }

        .calendar-hologram {
          flex-shrink: 0;
          height: 120px;
        }

        .hologram-calendar {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--nyc-cyan);
        }

        .calendar-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        .event-count {
          font-size: 1.5rem;
          font-weight: bold;
          font-family: var(--font-mono);
          color: var(--nyc-orange);
        }

        .event-label {
          font-size: 0.8rem;
          font-family: var(--font-mono);
          letter-spacing: 0.1em;
        }

        .calendar-controls {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          overflow-y: auto;
        }

        .control-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .control-label {
          font-size: 0.8rem;
          font-family: var(--font-mono);
          color: var(--nyc-orange);
          letter-spacing: 0.1em;
        }

        .time-range-buttons {
          display: flex;
          gap: 0.25rem;
        }

        .time-button {
          flex: 1;
          padding: 0.5rem;
          background: rgba(0, 20, 40, 0.3);
          border: 1px solid var(--terminal-color);
          color: var(--terminal-color);
          font-family: var(--font-mono);
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .time-button:hover,
        .time-button.active {
          background: rgba(0, 56, 117, 0.5);
          border-color: var(--nyc-orange);
          color: var(--nyc-orange);
        }

        .type-selector {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .type-button {
          padding: 0.5rem;
          background: rgba(0, 20, 40, 0.3);
          border: 1px solid var(--terminal-color);
          color: var(--terminal-color);
          font-family: var(--font-mono);
          font-size: 0.8rem;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .type-button:hover,
        .type-button.active {
          background: rgba(0, 56, 117, 0.5);
          border-color: var(--nyc-orange);
          color: var(--nyc-orange);
        }

        .more-types {
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
          color: var(--terminal-color);
          font-family: var(--font-mono);
          text-align: center;
          opacity: 0.7;
        }

        .export-buttons {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .export-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem;
          border: 1px solid var(--terminal-color);
          color: var(--terminal-color);
          font-family: var(--font-mono);
          font-size: 0.8rem;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s ease;
          background: rgba(0, 20, 40, 0.3);
        }

        .export-button:hover:not(.disabled) {
          background: rgba(0, 56, 117, 0.5);
          border-color: var(--nyc-orange);
          color: var(--nyc-orange);
        }

        .export-button.ics {
          background: rgba(0, 56, 117, 0.3);
        }

        .export-button.google {
          background: rgba(66, 133, 244, 0.2);
          border-color: rgba(66, 133, 244, 0.5);
        }

        .export-button.google:hover:not(.disabled) {
          background: rgba(66, 133, 244, 0.4);
          border-color: #4285f4;
          color: #4285f4;
        }

        .export-button.disabled {
          opacity: 0.5;
          cursor: not-allowed;
          pointer-events: none;
        }

        .export-icon {
          font-size: 1rem;
        }
      `}</style>
    </div>
  );
} 