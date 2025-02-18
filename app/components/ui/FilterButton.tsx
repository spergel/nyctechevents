import React from 'react';

interface FilterButtonProps {
  label: string;
  count?: number;
  isActive: boolean;
  onClick: () => void;
}

export function FilterButton({ label, count, isActive, onClick }: FilterButtonProps) {
  return (
    <button
      className={`type-item ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      <div className="type-indicator">
        <div className="indicator-dot" />
        <div className="indicator-line" />
      </div>
      <span className="type-name">{label}</span>
      {count !== undefined && (
        <span className="type-count">{count}</span>
      )}

      <style jsx>{`
        .type-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: rgba(0, 56, 117, 0.3);
          border: 1px solid transparent;
          transition: all 0.2s ease;
          cursor: pointer;
          width: 100%;
          text-align: left;
          color: var(--nyc-white);
          font-family: var(--font-mono);
        }

        .type-indicator {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .indicator-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: 1px solid var(--terminal-color);
          transition: all 0.2s ease;
        }

        .indicator-line {
          width: 12px;
          height: 1px;
          background: var(--terminal-color);
          opacity: 0.5;
        }

        .type-name {
          flex: 1;
          font-size: 0.9rem;
        }

        .type-count {
          font-size: 0.8rem;
          color: var(--nyc-orange);
          opacity: 0.8;
        }

        .type-item:hover {
          border-color: var(--terminal-color);
          background: rgba(0, 56, 117, 0.5);
        }

        .type-item.active {
          background: rgba(0, 56, 117, 0.8);
          border-color: var(--nyc-orange);
        }

        .type-item.active .indicator-dot {
          background: var(--nyc-orange);
          border-color: var(--nyc-orange);
          box-shadow: 0 0 10px var(--nyc-orange);
        }
      `}</style>
    </button>
  );
} 