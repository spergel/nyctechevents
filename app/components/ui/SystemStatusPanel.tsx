'use client';
import React from 'react';

interface StatusItem {
  label: string;
  value: number;
  color: string;
}

interface SystemStatusPanelProps {
  statuses: StatusItem[];
}

export function SystemStatusPanel({ statuses }: SystemStatusPanelProps) {
  return (
    <div className="system-status-panel">
      {statuses.map((status, index) => (
        <div key={index} className="status-item">
          <div className="status-label">{status.label}</div>
          <div className="status-bar">
            <div
              className="status-fill"
              style={{
                width: `${status.value}%`,
                background: `linear-gradient(90deg, ${status.color} 0%, transparent 100%)`,
              }}
            />
            <div className="status-scanline" />
          </div>
        </div>
      ))}
      <style jsx>{`
        .system-status-panel {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding: 0.5rem;
          height: 100%;
          min-height: 0;
        }

        .status-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .status-label {
          font-size: 0.8rem;
          color: var(--nyc-orange);
          font-family: var(--font-mono);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .status-bar {
          position: relative;
          height: 12px;
          background: rgba(0, 20, 40, 0.8);
          border: 1px solid var(--nyc-orange);
          overflow: hidden;
          min-width: 100px;
          margin-bottom: -1px;
        }

        .status-fill {
          height: 100%;
          position: relative;
          transition: width 0.5s ease;
        }

        .status-scanline {
          position: absolute;
          top: 0;
          right: 0;
          width: 20px;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.2) 50%,
            transparent 100%
          );
          animation: scan 2s linear infinite;
        }

        @media (max-width: 1200px) {
          .system-status-panel {
            gap: 0.75rem;
          }

          .status-bar {
            height: 10px;
          }
        }

        @media (max-width: 768px) {
          .system-status-panel {
            gap: 0.5rem;
            padding: 0.25rem;
          }

          .status-label {
            font-size: 0.7rem;
          }

          .status-bar {
            height: 8px;
            min-width: 80px;
          }
        }

        @keyframes scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
} 