import React from 'react';

interface HolographicDisplayProps {
  children: React.ReactNode;
}

export function HolographicDisplay({ children }: HolographicDisplayProps) {
  return (
    <div className="holographic-display">
      <div className="scan-line"></div>
      <div className="hologram-content">
        {children}
      </div>
      <div className="holo-overlay"></div>
      <div className="holo-base"></div>
      <div className="holo-flicker"></div>

      <style jsx>{`
        .holographic-display {
          position: relative;
          height: 100%;
          width: 100%;
          background: rgba(0, 20, 40, 0.3);
          border: 1px solid var(--nyc-orange);
          overflow: hidden;
          perspective: 1000px;
        }

        .hologram-content {
          position: relative;
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
          animation: float 10s ease-in-out infinite;
          z-index: 2;
        }

        .hologram-content :global(img) {
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: 
            brightness(1.2)
            contrast(1.1)
            drop-shadow(0 0 10px var(--terminal-color));
          opacity: 0.8;
          mix-blend-mode: screen;
        }

        .scan-line {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 100%;
          background: linear-gradient(
            to bottom,
            transparent 0%,
            rgba(0, 255, 255, 0.2) 50%,
            transparent 100%
          );
          animation: scan 8s linear infinite;
          z-index: 3;
          pointer-events: none;
        }

        .holo-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            repeating-linear-gradient(
              0deg,
              rgba(0, 255, 255, 0.1) 0px,
              transparent 1px,
              transparent 2px
            ),
            repeating-linear-gradient(
              90deg,
              rgba(0, 255, 255, 0.1) 0px,
              transparent 1px,
              transparent 2px
            );
          pointer-events: none;
          z-index: 4;
        }

        .holo-base {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: var(--terminal-color);
          box-shadow: 
            0 0 20px var(--terminal-color),
            0 0 40px var(--terminal-color),
            0 0 60px var(--terminal-color);
          z-index: 1;
        }

        .holo-flicker {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 255, 255, 0.1);
          opacity: 0;
          animation: flicker 0.5s infinite;
          pointer-events: none;
          z-index: 5;
        }

        @keyframes float {
          0%, 100% { 
            transform: 
              rotateX(2deg)
              rotateY(0deg)
              translateZ(0);
          }
          25% {
            transform:
              rotateX(1deg)
              rotateY(1deg)
              translateZ(10px);
          }
          50% {
            transform:
              rotateX(0deg)
              rotateY(2deg)
              translateZ(0);
          }
          75% {
            transform:
              rotateX(-1deg)
              rotateY(1deg)
              translateZ(10px);
          }
        }

        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }

        @keyframes flicker {
          0%, 100% { opacity: 0; }
          50% { opacity: 0.1; }
          25%, 75% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}