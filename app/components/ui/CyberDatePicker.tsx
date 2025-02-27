import React, { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';

interface CyberDatePickerProps {
  selectedDate: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  label?: string;
}

export function CyberDatePicker({ selectedDate, onChange, placeholder = 'SELECT DATE', label }: CyberDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = [];
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Add empty days for padding
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    // Add actual days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleDateSelect = (date: Date | null) => {
    onChange(date);
    setIsOpen(false);
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <div className="date-picker-container" ref={containerRef}>
      {label && <div className="date-picker-label">{label}</div>}
      <button 
        className="date-picker-trigger" 
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="date-text">
          {selectedDate ? format(selectedDate, 'MMM dd, yyyy') : placeholder}
        </span>
        <span className="calendar-icon">◈</span>
      </button>

      {isOpen && (
        <div className="calendar-popup">
          <div className="calendar-header">
            <button onClick={handlePrevMonth}>◀</button>
            <div className="current-month">
              {format(currentMonth, 'MMMM yyyy')}
            </div>
            <button onClick={handleNextMonth}>▶</button>
          </div>

          <div className="calendar-grid">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day} className="day-header">{day}</div>
            ))}
            
            {days.map((date, index) => (
              <button
                key={index}
                className={`day-cell ${!date ? 'empty' : ''} ${
                  date && selectedDate && 
                  date.toDateString() === selectedDate.toDateString() 
                    ? 'selected' 
                    : ''
                }`}
                onClick={() => date && handleDateSelect(date)}
                disabled={!date}
              >
                {date ? date.getDate() : ''}
              </button>
            ))}
          </div>

          {selectedDate && (
            <button 
              className="clear-date" 
              onClick={() => handleDateSelect(null)}
            >
              CLEAR DATE
            </button>
          )}
        </div>
      )}

      <style jsx>{`
        .date-picker-container {
          position: relative;
          width: 100%;
        }

        .date-picker-label {
          color: var(--terminal-color);
          font-size: 0.8rem;
          margin-bottom: 0.25rem;
          font-family: var(--font-mono);
        }

        .date-picker-trigger {
          width: 100%;
          padding: 0.5rem 1rem;
          background: rgba(0, 56, 117, 0.3);
          border: 1px solid var(--nyc-orange);
          color: var(--terminal-color);
          font-family: var(--font-mono);
          font-size: 0.9rem;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.2s ease;
        }

        .date-picker-trigger:hover {
          background: rgba(0, 56, 117, 0.5);
        }

        .calendar-icon {
          color: var(--nyc-orange);
        }

        .calendar-popup {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 0.5rem;
          background: var(--panel-bg);
          border: 1px solid var(--nyc-orange);
          border-radius: 4px;
          padding: 1rem;
          z-index: 1000;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        }

        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .calendar-header button {
          background: none;
          border: none;
          color: var(--nyc-orange);
          cursor: pointer;
          padding: 0.25rem 0.5rem;
          font-size: 0.8rem;
        }

        .current-month {
          color: var(--nyc-white);
          font-family: var(--font-mono);
          font-size: 0.9rem;
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 2px;
        }

        .day-header {
          color: var(--terminal-color);
          font-size: 0.7rem;
          text-align: center;
          padding: 0.25rem;
          font-family: var(--font-mono);
        }

        .day-cell {
          aspect-ratio: 1;
          background: rgba(0, 56, 117, 0.3);
          border: 1px solid transparent;
          color: var(--nyc-white);
          font-family: var(--font-mono);
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .day-cell:hover:not(.empty) {
          background: rgba(0, 56, 117, 0.5);
          border-color: var(--terminal-color);
        }

        .day-cell.selected {
          background: rgba(0, 56, 117, 0.8);
          border-color: var(--nyc-orange);
          color: var(--nyc-orange);
        }

        .day-cell.empty {
          background: none;
          cursor: default;
        }

        .clear-date {
          width: 100%;
          margin-top: 1rem;
          padding: 0.5rem;
          background: rgba(0, 56, 117, 0.3);
          border: 1px solid var(--terminal-color);
          color: var(--terminal-color);
          font-family: var(--font-mono);
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .clear-date:hover {
          background: rgba(0, 56, 117, 0.5);
          border-color: var(--nyc-orange);
          color: var(--nyc-orange);
        }
      `}</style>
    </div>
  );
} 