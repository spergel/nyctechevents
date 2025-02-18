'use client';
import React from 'react';

interface DetailSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function DetailSection({ title, children, className = '' }: DetailSectionProps) {
  return (
    <div className={`detail-section ${className}`}>
      <h3>{`>`} {title}</h3>
      {children}
      <style jsx>{`
        .detail-section {
          margin: 2rem 0;
        }

        h3 {
          font-family: 'Eurostile', sans-serif;
          font-size: 1.2rem;
          color: var(--terminal-color);
          margin-bottom: 1rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          position: relative;
        }

        h3::before {
          content: '';
          position: absolute;
          left: -15px;
          top: 50%;
          width: 10px;
          height: 2px;
          background: var(--terminal-color);
        }
      `}</style>
    </div>
  );
} 