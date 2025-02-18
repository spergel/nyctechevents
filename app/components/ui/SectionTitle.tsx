import React from 'react';

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  variant?: 'primary' | 'secondary';
  className?: string;
}

export function SectionTitle({ 
  title, 
  subtitle, 
  variant = 'primary',
  className = ''
}: SectionTitleProps) {
  return (
    <div className={`section-title-container ${variant} ${className}`}>
      <div className="title-bar">
        <div className="title-controls">
          {[...Array(3)].map((_, i) => (
            <span key={i} className="control-dot chrome-texture" />
          ))}
        </div>
        <div className="title-text">
          <h2 data-text={title}>{title}</h2>
          {subtitle && <p className="subtitle glitch-text">{subtitle}</p>}
        </div>
      </div>
      <style jsx>{`
        .section-title-container {
          background: var(--panel-bg);
          margin: 0;
          padding: 0;
          font-family: var(--font-mono);
          position: relative;
        }

        .title-bar {
          background: conic-gradient(
            from 45deg,
            var(--nyc-blue) 0%,
            #0066cc 30%,
            var(--terminal-color) 50%,
            #0066cc 70%,
            var(--nyc-blue) 100%
          ) !important;
          padding: 0.5rem 1rem;
          border: 2px solid var(--nyc-orange);
          box-shadow: var(--border-glow);
          position: relative;
          overflow: visible;
        }

        .title-bar::before {
          content: '';
          position: absolute;
          inset: 0;
          background: url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100' height='100' fill='none' stroke='%2300ffff' stroke-width='2' stroke-opacity='0.1'/%3E%3C/svg%3E");
          mix-blend-mode: overlay;
        }

        .chrome-texture {
          background: radial-gradient(circle at 30% 30%, 
            var(--nyc-white) 0%, 
            #cccccc 25%, 
            #666666 50%, 
            #333333 75%) !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3),
                      inset 0 1px 2px rgba(255, 255, 255, 0.4);
        }

        .title-controls {
          display: flex;
          gap: 0.25rem;
          padding-right: 0.5rem;
          border-right: 1px solid rgba(255, 107, 28, 0.2);
        }

        .control-dot {
          width: 6px;
          height: 6px;
          background: var(--nyc-orange);
          border-radius: 50%;
          opacity: 0.7;
        }

        .title-text {
          flex: 1;
          padding: 0 0;
          position: relative;
        }

        .title-text h2 {
          position: relative;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5),
                       0 0 10px var(--nyc-orange);
          transform: translateZ(0);
        }

        .title-text h2::after {
          content: attr(data-text);
          position: absolute;
          left: 0;
          top: 0;
          color: transparent;
          text-shadow: 2px 2px 4px rgba(255, 107, 28, 0.3);
          z-index: -1;
        }

        .subtitle {
          background: linear-gradient(to right, var(--terminal-color), #00ff99);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          font-weight: 700;
        }

        .title-status {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding-left: 0.5rem;
          border-left: 1px solid rgba(255, 107, 28, 0.2);
        }

        .status-indicator {
          background: #00ff00;
          box-shadow: 0 0 8px #00ff00;
        }

        .pulse-glow {
          animation: pulse-glow 1.5s infinite ease-in-out;
        }

        .status-text {
          font-size: 0.7rem;
          color: var(--nyc-white);
          letter-spacing: 1px;
        }

        .primary .title-bar {
          background: linear-gradient(180deg, 
            var(--nyc-blue) 0%,
            rgba(0, 20, 40, 0.8) 100%
          );
        }

        .secondary .title-bar {
          background: linear-gradient(180deg, 
            rgba(0, 20, 40, 0.9) 0%,
            rgba(0, 20, 40, 0.7) 100%
          );
        }

        @keyframes scanline {
          0% { transform: translateX(-100%) skewX(-15deg); }
          100% { transform: translateX(100%) skewX(-15deg); }
        }

        @keyframes pulse-glow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }

        .glitch-text:hover {
          animation: glitch 0.3s infinite;
        }

        @keyframes glitch {
          0% { text-shadow: 2px 0 rgba(255,0,0,0.5), -2px 0 rgba(0,0,255,0.5); }
          25% { clip-path: inset(10% 0 30% 0); }
          50% { clip-path: inset(20% 0 15% 0); }
          75% { transform: translate(-2px, 1px); }
          100% { transform: translate(2px, -1px); }
        }

        @media (max-width: 768px) {
          .title-bar {
            flex-direction: column;
            gap: 0.5rem;
            align-items: flex-start;
          }

          .title-controls, .title-status {
            width: 100%;
            justify-content: flex-start;
            border: none;
            padding: 0;
          }
        }

        .section-title-container::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at 50% 0%, 
            rgba(0, 255, 255, 0.1) 0%, 
            transparent 70%);
          pointer-events: none;
          mix-blend-mode: overlay;
        }
      `}</style>
    </div>
  );
} 