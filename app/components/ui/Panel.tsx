import React from 'react';

interface PanelProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'monitor';
  className?: string;
  title?: string;
  systemId?: string;
}

export function Panel({ 
  title, 
  children, 
  systemId, 
  variant = 'primary',
  className = ''
}: PanelProps) {
  return (
    <div className={`panel ${variant} ${className}`}>
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

      <style jsx>{`
        .panel {
          background: var(--panel-bg);
          border: 1px solid var(--nyc-orange);
          margin-bottom: -1px;
          position: relative;
          overflow: hidden;
        }

        .panel::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: 
            linear-gradient(90deg, transparent 50%, rgba(0, 255, 0, 0.03) 50%),
            linear-gradient(0deg, transparent 50%, rgba(0, 255, 0, 0.02) 50%);
          background-size: 4px 4px;
          pointer-events: none;
        }

        .panel-header {
          background: linear-gradient(90deg, var(--nyc-blue), var(--background));
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--nyc-orange);
          margin-bottom: -1px;
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
          padding: 1rem;
        }

        .panel.secondary {
          background: rgba(0, 56, 117, 0.7);
        }

        .panel.monitor {
          border: 1px solid var(--nyc-orange);
        }

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
      `}</style>
    </div>
  );
} 