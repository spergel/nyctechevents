'use client';
import React from 'react';

interface NavigationItem {
  label: string;
  link: string;
}

interface NavigationArrayProps {
  items: NavigationItem[];
}

export function NavigationArray({ items }: NavigationArrayProps) {
  return (
    <div className="navigation-array">
      {items.map((item, index) => (
        <a key={index} href={item.link} className="nav-item">
          {item.label}
        </a>
      ))}
      <style jsx>{`
        .navigation-array {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .nav-item {
          padding: 1rem 2rem;
          background: linear-gradient(135deg, var(--nyc-blue) 0%, var(--header-bg) 100%);
          color: var(--nyc-white);
          border: 2px solid var(--nyc-orange);
          clip-path: polygon(15px 0, 100% 0, calc(100% - 15px) 100%, 0 100%);
          text-decoration: none;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .nav-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(255, 107, 28, 0.4);
        }
      `}</style>
    </div>
  );
} 