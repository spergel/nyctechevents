import React from 'react';
import { useRouter } from 'next/navigation';

interface PageNavProps {
  title: string;
  systemId: string;
  showBackButton?: boolean;
}

export function PageNav({ title, systemId, showBackButton = true }: PageNavProps) {
  const router = useRouter();

  const handleBack = () => {
    // Try to go back in history first
    if (window.history.length > 1) {
      router.back();
    } else {
      // Default fallback paths based on current URL
      if (window.location.pathname.includes('/events/')) {
        router.push('/events');
      } else if (window.location.pathname.includes('/locations/')) {
        router.push('/locations');
      } else if (window.location.pathname.includes('/communities/')) {
        router.push('/communities');
      } else if (window.location.pathname.includes('/substacks/')) {
        router.push('/substacks');
      }
    }
  };

  return (
    <div className="page-nav">
      <div className="nav-left">
        {showBackButton && (
          <button onClick={handleBack} className="back-button">
            <span className="back-icon">◀</span>
            <span>BACK</span>
          </button>
        )}
        <h1 className="page-title">{title}</h1>
      </div>
      <div className="system-id">{systemId}</div>

      <style jsx>{`
        .page-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: var(--panel-bg);
          border-bottom: 1px solid var(--nyc-orange);
        }

        .nav-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .back-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: rgba(0, 56, 117, 0.3);
          border: 1px solid var(--nyc-orange);
          color: var(--nyc-orange);
          font-family: var(--font-mono);
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .back-button:hover {
          background: rgba(0, 56, 117, 0.5);
          transform: translateY(-1px);
        }

        .back-icon {
          font-size: 0.7rem;
        }

        .page-title {
          color: var(--nyc-orange);
          font-size: 1.5rem;
          margin: 0;
          font-family: var(--font-display);
        }

        .system-id {
          color: var(--terminal-color);
          font-family: var(--font-mono);
          font-size: 0.8rem;
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
} 