'use client';
import React from 'react';
import { SectionTitle } from './SectionTitle';

interface ConsoleModuleProps {
  title?: string;
  variant?: 'primary' | 'secondary' | 'monitor';
  position?: 'top-left' | 'top' | 'top-right' | 'left' | 'right' | 'bottom-left' | 'bottom' | 'bottom-right';
  children: React.ReactNode;
  systemId?: string;
  footerStats?: {
    left: string;
    right: string;
  };
}

export function ConsoleModule({ 
  title, 
  variant = 'primary', 
  position = 'top', 
  children,
  systemId,
  footerStats
}: ConsoleModuleProps) {
  return (
    <div className={`console-module ${variant} ${position}`}>
      <div className="module-content">
        {children}
      </div>
      {footerStats && (
        <div className="module-footer">
          <div className="footer-stats">
            <span>{footerStats.left}</span>
            <span>{footerStats.right}</span>
          </div>
        </div>
      )}
      <style jsx>{`
        .console-module {
          background: var(--panel-bg);
          border: 1px solid var(--nyc-orange);
          padding: 0;
          position: relative;
          overflow: hidden;
          box-shadow: var(--border-glow);
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        
        .module-content {
          flex: 1;
          overflow-y: auto;
          position: relative;
          z-index: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          scrollbar-width: thin;
          scrollbar-color: var(--nyc-orange) var(--panel-bg);
        }

        .module-content :global(.map-container) {
          flex: 1;
          min-height: 0;
          padding: 0;
        }

        .module-content::-webkit-scrollbar {
          width: 6px;
        }

        .module-content::-webkit-scrollbar-track {
          background: var(--panel-bg);
        }

        .module-content::-webkit-scrollbar-thumb {
          background: var(--nyc-orange);
          border-radius: 3px;
        }

        .module-footer {
          padding: 0.25rem 0.5rem;
          background: rgba(0, 20, 40, 0.8);
          border-top: 1px solid var(--nyc-orange);
          font-family: var(--font-mono);
          font-size: 0.7rem;
          color: var(--terminal-color);
          min-height: 1.5rem;
          margin-top: -1px;
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
        
        .console-module::before {
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

        .console-module::after {
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