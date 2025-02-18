'use client';
import React, { useState, useEffect } from 'react';

interface DataStreamProps {
  lines?: number;
  className?: string;
}

export function DataStream({ lines = 10, className = '' }: DataStreamProps) {
  const [data, setData] = useState<string[]>([]);

  useEffect(() => {
    const generateData = () => {
      const newData = Array.from({ length: lines }, () => {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      });
      setData(newData);
    };

    generateData(); // Initial data
    const interval = setInterval(generateData, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [lines]);

  return (
    <div className={`data-stream ${className}`}>
      {data.map((line, index) => (
        <div key={index} className="data-line">
          {`> ${line}`}
        </div>
      ))}
      <style jsx>{`
        .data-stream {
          font-family: 'Consolas', monospace;
          color: var(--terminal-color);
          overflow: hidden;
          position: relative;
          background: var(--header-bg);
          height: 100%;
          min-height: 0;
          display: flex;
          flex-direction: column;
          padding: 0.5rem;
        }

        .data-line {
          opacity: 0.8;
          margin: 0.2rem 0;
          animation: fade-in 0.5s ease-out;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 0.9rem;
          line-height: 1.2;
        }

        .data-stream::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            to bottom,
            transparent 0%,
            var(--panel-bg) 50%,
            transparent 100%
          );
          pointer-events: none;
          z-index: 1;
        }

        @media (max-width: 1200px) {
          .data-line {
            font-size: 0.85rem;
            margin: 0.15rem 0;
          }
        }

        @media (max-width: 768px) {
          .data-stream {
            padding: 0.25rem;
          }

          .data-line {
            font-size: 0.8rem;
            margin: 0.1rem 0;
          }
        }

        @keyframes fade-in {
          0% {
            opacity: 0;
            transform: translateY(-5px);
          }
          100% {
            opacity: 0.8;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
} 