import React from 'react';

interface DataGridProps {
  data: { label: string; value: number }[];
}

export function DataGrid({ data }: DataGridProps) {
  return (
    <div className="data-grid">
      {data.map((item, index) => (
        <div key={index} className="grid-cell">
          <div className="cell-label">{item.label}</div>
          <div className="cell-value">{item.value}</div>
          <div className="cell-scanline" />
        </div>
      ))}
      <style jsx>{`
        .data-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
          gap: 0;
        }

        .grid-cell {
          position: relative;
          padding: 1rem;
          background: rgba(0, 20, 40, 0.5);
          border: 1px solid var(--nyc-orange);
          overflow: hidden;
          margin-bottom: -1px;
          margin-right: -1px;
        }

        .cell-scanline {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent 48%,
            rgba(0, 255, 255, 0.1) 50%,
            transparent 52%
          );
          animation: scan 3s linear infinite;
        }

        .cell-label {
          font-size: 0.8rem;
          color: var(--nyc-orange);
          margin-bottom: 0.5rem;
        }

        .cell-value {
          font-size: 1rem;
          color: var(--nyc-white);
        }

        @keyframes scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
} 