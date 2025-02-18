'use client';
import React from 'react';

interface CyberLinkProps {
  href: string;
  children: React.ReactNode;
  variant?: 'default' | 'community' | 'source' | 'directory';
  external?: boolean;
}

export function CyberLink({ href, children, variant = 'default', external = false }: CyberLinkProps) {
  const linkProps = external ? {
    target: "_blank",
    rel: "noopener noreferrer"
  } : {};

  return (
    <>
      <a href={href} className={`cyber-link ${variant}`} {...linkProps}>
        {children}
      </a>
      <style jsx>{`
        .cyber-link {
          display: inline-block;
          color: var(--nyc-white);
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .cyber-link.default {
          padding: 0.5rem 1rem;
          background: rgba(0, 56, 117, 0.3);
          border: 1px solid var(--accent-dark);
          clip-path: polygon(10px 0, 100% 0, 100% 70%, calc(100% - 10px) 100%, 0 100%, 0 30%);
        }

        .cyber-link.default:hover {
          border-color: var(--accent);
          background: rgba(0, 56, 117, 0.5);
          transform: translateX(4px);
        }

        .cyber-link.community {
          padding: 0.5rem 1rem;
          background: rgba(0, 56, 117, 0.3);
          border: 1px solid var(--accent-dark);
          clip-path: polygon(10px 0, 100% 0, 100% 70%, calc(100% - 10px) 100%, 0 100%, 0 30%);
        }

        .cyber-link.community:hover {
          border-color: var(--accent);
          background: rgba(0, 56, 117, 0.5);
          transform: translateX(4px);
        }

        .cyber-link.source {
          color: var(--terminal-color);
          border-bottom: 1px solid var(--accent-dark);
        }

        .cyber-link.source:hover {
          color: var(--accent);
          border-color: var(--accent);
        }

        .cyber-link.directory {
          padding: 0.5rem 1rem;
          background: rgba(0, 56, 117, 0.3);
          border: 1px solid var(--terminal-color);
          color: var(--terminal-color);
          font-family: var(--font-mono);
          clip-path: polygon(10px 0, 100% 0, 100% 70%, calc(100% - 10px) 100%, 0 100%, 0 30%);
        }

        .cyber-link.directory:hover {
          border-color: var(--nyc-orange);
          background: rgba(0, 56, 117, 0.5);
          color: var(--nyc-orange);
          transform: translateX(4px);
        }
      `}</style>
    </>
  );
} 