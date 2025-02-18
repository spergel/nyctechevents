import React from 'react';

interface CyberButtonProps {
  onClick: () => void;
  label: string;
  variant?: 'primary' | 'secondary';
}

export function CyberButton({ onClick, label, variant = 'primary' }: CyberButtonProps) {
  return (
    <button className={`cyber-button ${variant}`} onClick={onClick}>
      <span className="button-label">{label}</span>
      <div className="button-scanline" />
      <style jsx>{`
        .cyber-button {
          position: relative;
          padding: 1rem 2rem;
          background: linear-gradient(135deg, var(--nyc-blue) 0%, var(--header-bg) 100%);
          color: var(--nyc-white);
          border: 2px solid var(--nyc-orange);
          clip-path: polygon(15px 0, 100% 0, calc(100% - 15px) 100%, 0 100%);
          cursor: pointer;
          overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .cyber-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(255, 107, 28, 0.4);
        }

        .button-scanline {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent 45%,
            rgba(0, 255, 255, 0.2) 50%,
            transparent 55%
          );
          animation: scan 4s linear infinite;
        }

        .button-label {
          position: relative;
          z-index: 1;
        }

        @keyframes scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </button>
  );
} 