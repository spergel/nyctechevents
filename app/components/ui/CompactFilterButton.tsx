import React from 'react';

interface CompactFilterButtonProps {
  label: string;
  count?: number;
  isActive: boolean;
  onClick: () => void;
}

export function CompactFilterButton({ label, count, isActive, onClick }: CompactFilterButtonProps) {
  return (
    <button
      className={`filter-button ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      <div className="dot" />
      <span className="label">{label}</span>
      {count !== undefined && (
        <span className="count">{count}</span>
      )}

      <style jsx>{`
        .filter-button {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.4rem 0.8rem;
          background: rgba(0, 56, 117, 0.3);
          border: 1px solid transparent;
          border-radius: 0;
          transition: all 0.2s ease;
          cursor: pointer;
          color: var(--nyc-white);
          font-family: var(--font-mono);
          font-size: 0.8rem;
          min-width: fit-content;
          white-space: nowrap;
          margin-bottom: -1px;
        }

        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--terminal-color);
          opacity: 0.5;
          transition: all 0.2s ease;
        }

        .label {
          color: var(--terminal-color);
        }

        .count {
          font-size: 0.75rem;
          color: var(--nyc-orange);
          opacity: 0.8;
          padding-left: 0.25rem;
          border-left: 1px solid rgba(255, 107, 28, 0.3);
        }

        .filter-button:hover {
          background: rgba(0, 56, 117, 0.5);
          transform: translateY(-1px);
        }

        .filter-button:hover .dot {
          opacity: 1;
        }

        .filter-button.active {
          background: rgba(0, 56, 117, 0.8);
          border: 1px solid var(--nyc-orange);
        }

        .filter-button.active .dot {
          background: var(--nyc-orange);
          opacity: 1;
          box-shadow: 0 0 8px var(--nyc-orange);
        }

        .filter-button.active .label {
          color: var(--nyc-white);
        }
      `}</style>
    </button>
  );
} 