'use client';
import React, { useState, useEffect } from 'react';
import communities from '@/public/data/communities.json';
import { Panel } from '@/app/components/ui/Panel';
import { HolographicDisplay } from '@/app/components/ui/HolographicDisplay';
import { FilterButton } from '@/app/components/ui/FilterButton';
import Loading from '@/app/loading';

export default function Communities() {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  useEffect(() => {
    if (document.readyState === 'complete') {
      setIsLoading(false);
    } else {
      const handleLoad = () => {
        setIsLoading(false);
      };
      window.addEventListener('load', handleLoad);
      return () => window.removeEventListener('load', handleLoad);
    }
  }, []);

  const communityTypes = Array.from(new Set(communities.communities.map(c => c.type)));

  const filteredCommunities = communities.communities.filter(community =>
    selectedTypes.length === 0 || selectedTypes.includes(community.type)
  );

  const toggleType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  if (isLoading) return <Loading />;

  return (
    <main className="communities-page">
      <div className="communities-layout">
        <div className="main-section">
          <Panel title="NYC COMMUNITIES DIRECTORY" systemId="COM-001">
            <div className="communities-grid">
              {filteredCommunities.map((community) => (
                <a key={community.id} href={`/communities/${community.id}`} className="community-card">
                  <div className="card-header">
                    <div className="header-left">
                      <span className="community-type">{community.type}</span>
                      <span className="community-founded">EST. {community.founded}</span>
                    </div>
                    <div className="header-status" />
                  </div>
                  <div className="community-name">{community.name}</div>
                  <div className="community-categories">
                    {community.category.map((cat: string, i: number) => (
                      <span key={i} className="category-tag">{cat}</span>
                    ))}
                  </div>
                  <div className="card-footer">
                    <div className="footer-line" />
                    <div className="footer-dots">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="dot" />
                      ))}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </Panel>
        </div>

        <div className="filters-section">
          <Panel title="COMMUNITY TYPES" systemId="TYPE-001" variant="secondary">
            <div className="filters-content">
              <div className="type-list">
                {communityTypes.map((type) => (
                  <FilterButton
                    key={type}
                    label={type}
                    count={communities.communities.filter(c => c.type === type).length}
                    isActive={selectedTypes.includes(type)}
                    onClick={() => toggleType(type)}
                  />
                ))}
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <style jsx>{`
        .communities-page {
          width: 100%;
          height: 100%;
        }

        .communities-layout {
          display: grid;
          grid-template-columns: 1fr 280px;
          gap: 1rem;
          height: 100%;
          padding: 1rem;
        }

        .main-section {
          height: 100%;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .communities-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 0;
          padding: 0;
          overflow-y: auto;
          max-height: calc(100vh - 100px);
        }

        .filters-section {
          height: 100%;
          min-width: 280px;
        }

        .filters-content {
          height: calc(100vh - 100px);
          overflow-y: auto;
          padding: 1rem;
        }

        .type-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .community-card {
          display: flex;
          flex-direction: column;
          padding: 1rem;
          background: rgba(0, 56, 117, 0.3);
          border: 1px solid rgba(0, 56, 117, 0.3);
          text-decoration: none;
          color: var(--nyc-white);
          transition: all 0.2s ease;
          height: 180px;
          margin: 0;
          border-right: none;
          border-bottom: none;
        }

        .community-card:last-child {
          border-right: 1px solid rgba(0, 56, 117, 0.3);
        }

        .communities-grid > *:nth-last-child(-n+3) {
          border-bottom: 1px solid rgba(0, 56, 117, 0.3);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .header-left {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .header-status {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--nyc-orange);
          box-shadow: 0 0 10px var(--nyc-orange);
          animation: pulse 2s infinite;
        }

        .community-type {
          color: var(--terminal-color);
          font-family: var(--font-mono);
          font-size: 0.8rem;
          padding: 0.2rem 0.5rem;
          background: rgba(0, 255, 255, 0.1);
          border-radius: 2px;
        }

        .community-founded {
          color: var(--nyc-orange);
          font-family: var(--font-mono);
          font-size: 0.8rem;
        }

        .community-name {
          font-family: var(--font-display);
          font-size: 1.1rem;
          margin-bottom: 0.5rem;
          color: var(--nyc-white);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .community-categories {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: auto;
        }

        .category-tag {
          font-size: 0.7rem;
          padding: 0.2rem 0.5rem;
          background: rgba(0, 255, 255, 0.1);
          border: 1px solid var(--terminal-color);
          color: var(--terminal-color);
          font-family: var(--font-mono);
        }

        .card-footer {
          margin-top: auto;
          padding-top: 0.5rem;
        }

        .footer-line {
          height: 1px;
          background: var(--terminal-color);
          opacity: 0.3;
          margin-bottom: 0.5rem;
        }

        .footer-dots {
          display: flex;
          gap: 0.25rem;
          justify-content: center;
        }

        .dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: var(--terminal-color);
          opacity: 0.5;
        }

        .community-card:hover {
          border-color: var(--nyc-orange);
          background: rgba(0, 56, 117, 0.5);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(255, 107, 28, 0.2);
        }

        .community-card:hover .dot {
          background: var(--nyc-orange);
          opacity: 1;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @media (max-width: 1024px) {
          .communities-layout {
            grid-template-columns: 1fr;
            grid-template-rows: auto 1fr;
          }

          .communities-grid {
            gap: 0;
            padding: 0;
          }

          .community-card {
            border-right: 1px solid rgba(0, 56, 117, 0.3);
          }
        }

        @media (max-width: 768px) {
          .community-card {
            height: 160px;
            padding: 0.75rem;
          }
        }

        @media (max-width: 480px) {
          .community-card {
            height: 140px;
            padding: 0.5rem;
          }
        }
      `}</style>
    </main>
  );
} 