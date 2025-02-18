'use client';
import React from 'react';

interface MetaInfoProps {
  data: Record<string, string | undefined>;
}

export function MetaInfo({ data }: MetaInfoProps) {
  const filteredData = Object.entries(data).filter(([_, value]) => value !== undefined);

  return (
    <pre className="meta">
      {filteredData.map(([key, value]) => `${key}: ${value}`).join('\n')}
      <style jsx>{`
        .meta {
          font-family: var(--font-mono);
          font-size: 0.9rem;
          color: var(--nyc-orange);
          background: rgba(0, 20, 40, 0.3);
          padding: 1rem;
          margin: 1rem 0;
          border: 1px solid var(--accent-dark);
          clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px);
          position: relative;
          overflow: hidden;
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        .meta::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: 
            linear-gradient(90deg, transparent 50%, rgba(255, 107, 28, 0.1) 50%),
            linear-gradient(0deg, transparent 50%, rgba(255, 107, 28, 0.1) 50%);
          background-size: 4px 4px;
          pointer-events: none;
          opacity: 0.5;
        }

        @media (max-width: 768px) {
          .meta {
            font-size: 0.85rem;
            padding: 0.75rem;
            margin: 0.75rem 0;
            clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
          }
        }

        @media (max-width: 480px) {
          .meta {
            font-size: 0.8rem;
            padding: 0.5rem;
            margin: 0.5rem 0;
          }
        }
      `}</style>
    </pre>
  );
} 