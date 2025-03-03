import React from 'react';

interface FilterButtonProps {
  label: string;
  count?: number;
  isActive: boolean;
  onClick: () => void;
  variant?: 'default' | 'compact';
}

export function FilterButton({ label, count, isActive, onClick, variant = 'default' }: FilterButtonProps) {
  if (variant === 'compact') {
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
            width: 100%;
            text-align: left;
            margin-bottom: 0;
          }

          .dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: var(--terminal-color);
            opacity: 0.5;
            transition: all 0.2s ease;
            flex-shrink: 0;
          }

          .label {
            color: var(--terminal-color);
            white-space: normal;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .count {
            font-size: 0.75rem;
            color: var(--nyc-orange);
            opacity: 0.8;
            padding-left: 0.25rem;
            border-left: 1px solid rgba(255, 107, 28, 0.3);
            flex-shrink: 0;
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