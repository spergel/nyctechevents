import React from 'react';

interface FilterToggleButtonProps {
  isActive: boolean;
  onClick: () => void;
  resultCount?: number;
}

export function FilterToggleButton({ isActive, onClick, resultCount }: FilterToggleButtonProps) {
  return (
    <button 
      className={`filter-toggle-button ${isActive ? 'active' : ''}`}
      onClick={onClick}
      aria-label={isActive ? 'Hide filters' : 'Show filters'}
    >
      <span className="toggle-icon">{isActive ? '×' : '☰'}</span>
      <span className="toggle-text">
        {isActive ? 'HIDE FILTERS' : 'FILTERS'}
        {!isActive && resultCount !== undefined && (
          <span className="result-count">{resultCount}</span>
        )}
      </span>

      <style jsx>{`
        .filter-toggle-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: var(--nyc-blue);
          border: 1px solid var(--nyc-orange);
          color: var(--nyc-white);
          font-family: var(--font-mono);
          font-size: 0.9rem;
          border-radius: 0;
          box-shadow: 0 0 15px rgba(255, 107, 28, 0.4);
          clip-path: polygon(10px 0, 100% 0, 100% 70%, calc(100% - 10px) 100%, 0 100%, 0 30%);
          transition: all 0.2s ease;
          position: fixed;
          bottom: 1rem;
          right: 1rem;
          z-index: 100;
        }

        .filter-toggle-button.active {
          background: var(--nyc-orange);
          color: var(--nyc-blue);
        }

        .toggle-icon {
          font-size: 1.2rem;
        }

        .result-count {
          display: inline-block;
          margin-left: 0.5rem;
          background: var(--nyc-orange);
          color: var(--nyc-blue);
          font-size: 0.8rem;
          font-weight: bold;
          padding: 0.1rem 0.4rem;
          border-radius: 2px;
        }

        @media (max-width: 480px) {
          .filter-toggle-button {
            padding: 0.5rem 0.75rem;
            font-size: 0.8rem;
            bottom: 0.75rem;
            right: 0.75rem;
          }

          .toggle-icon {
            font-size: 1rem;
          }
        }
      `}</style>
    </button>
  );
} 