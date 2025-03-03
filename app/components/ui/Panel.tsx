import React from 'react';

interface PanelProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'monitor';
  className?: string;
  title?: string;
  systemId?: string;
  position?: 'top-left' | 'top' | 'top-right' | 'left' | 'right' | 'bottom-left' | 'bottom' | 'bottom-right';
  footerStats?: {
    left: string;
    right: string;
  };
}

export function Panel({ 
  title, 
  children, 
  systemId, 
  variant = 'primary',
  className = '',
  position = 'top',
  footerStats
}: PanelProps) {
  return (
    <div className={`panel ${variant} ${position} ${className}`}>
      {title && (
        <div className="panel-header">
          <div className="title-section">
            <h3>{title}</h3>
            <span className="system-id">{systemId}</span>
          </div>
        </div>
      )}
      <div className="panel-content">
        {children}
      </div>
      {footerStats && (
        <div className="panel-footer">
          <div className="footer-stats">
            <span>{footerStats.left}</span>
            <span>{footerStats.right}</span>
          </div>
        </div>
      )}

      <style jsx>{`
        .panel {
          background: var(--panel-bg);
          border: 1px solid var(--nyc-orange);
          margin-bottom: -1px;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .panel::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: 
            linear-gradient(90deg, transparent 50%, var(--grid-color) 50%),
            linear-gradient(0deg, transparent 50%, var(--grid-color) 50%);
          background-size: 4px 4px;
          pointer-events: none;
          opacity: 0.5;
          z-index: 0;
        }

        .panel::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            180deg,
            transparent 0%,
            var(--scanline-color) 50%,
            transparent 100%
          );
          background-size: 100% 4px;
          animation: scanline 10s linear infinite;
          pointer-events: none;
          opacity: 0.3;
          z-index: 0;
        }

        .panel-header {
          background: linear-gradient(90deg, var(--nyc-blue), var(--background));
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--nyc-orange);
          margin-bottom: -1px;
          z-index: 1;
        }

        .title-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        h3 {
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

        .panel-content {
          flex: 1;
          overflow-y: auto;
          position: relative;
          z-index: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          padding: 1rem;
          scrollbar-width: thin;
          scrollbar-color: var(--nyc-orange) var(--panel-bg);
        }

        .panel-content::-webkit-scrollbar {
          width: 6px;
        }

        .panel-content::-webkit-scrollbar-track {
          background: var(--panel-bg);
        }

        .panel-content::-webkit-scrollbar-thumb {
          background: var(--nyc-orange);
          border-radius: 3px;
        }

        .panel-footer {
          padding: 0.25rem 0.5rem;
          background: rgba(0, 20, 40, 0.8);
          border-top: 1px solid var(--nyc-orange);
          font-family: var(--font-mono);
          font-size: 0.7rem;
          color: var(--terminal-color);
          min-height: 1.5rem;
          margin-top: -1px;
          z-index: 1;
        }

        .footer-stats {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .footer-stats span {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .footer-stats span::before {
          content: '';
          display: inline-block;
          width: 6px;
          height: 6px;
          background: var(--nyc-orange);
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .panel.secondary {
          background: rgba(0, 56, 117, 0.7);
        }

        .panel.monitor {
          border: 1px solid var(--nyc-orange);
        }

        /* Grid positioning */
        .top-left { grid-column: 1; grid-row: 1; }
        .top { grid-column: 2; grid-row: 1; }
        .top-right { grid-column: 3; grid-row: 1; }
        .left { grid-column: 1; grid-row: 2; }
        .right { grid-column: 3; grid-row: 2; }
        .bottom-left { grid-column: 1; grid-row: 3; }
        .bottom { grid-column: 2; grid-row: 3; }
        .bottom-right { grid-column: 3; grid-row: 3; }

        @media (max-width: 768px) {
          .panel {
            margin: 0.5rem 0;
          }

          .panel-header {
            padding: 0.5rem 0.75rem;
          }

          h3 {
            font-size: 1rem;
          }

          .system-id {
            font-size: 0.7rem;
          }

          .panel-content {
            padding: 0.75rem;
          }
        }

        @media (max-width: 480px) {
          .panel-header {
            padding: 0.5rem;
          }

          .panel-content {
            padding: 0.5rem;
          }
        }

        @keyframes scanline {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 0 100%;
          }
        }

        @keyframes pulse {
          0% { opacity: 0.5; }
          50% { opacity: 1; }
          100% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
} 