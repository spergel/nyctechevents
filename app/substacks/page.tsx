'use client';
import React, { useState } from 'react';
import substacks from '@/data/substacks.json';
import substackPosts from '@/data/substackposts.json';
import { Panel } from '../components/ui/Panel';

interface Substack {
  id: string;
  name: string;
  url: string;
  description: string;
}

interface SubstackPost {
  id: string;
  title: string;
  subtitle: string;
  publication: string;
  url: string;
  post_date: string;
  description: string;
  cover_image: string;
  excerpt: string;
  type: string;
}

export default function SubstacksPage() {
  const [selectedSubstack, setSelectedSubstack] = useState<string | null>(null);

  const getPostsForSubstack = (substackId: string) => {
    return substackPosts.posts.filter(post => post.publication === substackId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <main className="substacks-page">
      <div className="substacks-layout">
        <div className="main-section">
          <Panel title="NYC SUBSTACKS" systemId="SUB-001">
            <div className="substacks-grid">
              {substacks.substacks.map((substack: Substack) => (
                <div
                  key={substack.id}
                  className={`substack-item ${selectedSubstack === substack.id ? 'selected' : ''}`}
                  onClick={() => setSelectedSubstack(substack.id)}
                >
                  <div className="substack-header">
                    <h4>{substack.name}</h4>
                    <div className="substack-indicator" />
                  </div>
                  <p>{substack.description}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="content-section">
          {selectedSubstack && (
            <Panel title="RECENT POSTS" systemId="POST-001">
              <div className="posts-grid">
                {getPostsForSubstack(selectedSubstack).map((post: SubstackPost) => (
                  <a
                    key={post.id}
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="post-item"
                  >
                    <div className="post-header">
                      <div className="post-date">{formatDate(post.post_date)}</div>
                      <div className="post-type">{post.type || 'POST'}</div>
                    </div>
                    <h4>{post.title}</h4>
                    <p>{post.excerpt}</p>
                  </a>
                ))}
              </div>
            </Panel>
          )}
        </div>
      </div>

      <style jsx>{`
        .substacks-page {
          width: 100%;
          height: 100%;
        }

        .substacks-layout {
          display: grid;
          grid-template-columns: 300px 1fr;
          gap: 0;
          height: 100%;
          padding: 0;
        }

        .main-section, .content-section {
          height: 100%;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .substacks-grid {
          display: flex;
          flex-direction: column;
          gap: 0;
          padding: 0;
          overflow-y: auto;
          max-height: calc(100vh - 100px);
        }

        .posts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 0;
          padding: 0;
          overflow-y: auto;
          max-height: calc(100vh - 100px);
        }

        .substack-item {
          padding: 1rem;
          background: rgba(0, 20, 40, 0.3);
          border: 1px solid var(--terminal-color);
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: -1px;
        }

        .substack-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .substack-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--terminal-color);
          opacity: 0.5;
          transition: all 0.2s ease;
        }

        .substack-item.selected .substack-indicator {
          background: var(--nyc-orange);
          opacity: 1;
          box-shadow: 0 0 8px var(--nyc-orange);
        }

        .substack-item h4 {
          color: var(--nyc-orange);
          margin: 0;
          font-family: var(--font-display);
          font-size: 1rem;
        }

        .substack-item p {
          color: var(--terminal-color);
          margin: 0;
          font-size: 0.9rem;
          opacity: 0.8;
          line-height: 1.4;
        }

        .post-item {
          padding: 1rem;
          background: rgba(0, 20, 40, 0.3);
          border: 1px solid var(--terminal-color);
          text-decoration: none;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: -1px;
          margin-right: -1px;
        }

        .post-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .post-date {
          color: var(--terminal-color);
          font-family: var(--font-mono);
          font-size: 0.8rem;
          opacity: 0.8;
        }

        .post-type {
          color: var(--nyc-orange);
          font-family: var(--font-mono);
          font-size: 0.8rem;
          padding: 0.2rem 0.5rem;
          background: rgba(0, 56, 117, 0.3);
          border: 1px solid var(--nyc-orange);
        }

        .post-item h4 {
          color: var(--nyc-orange);
          margin: 0;
          font-family: var(--font-display);
          font-size: 1.1rem;
          line-height: 1.3;
        }

        .post-item p {
          color: var(--terminal-color);
          margin: 0;
          font-size: 0.9rem;
          opacity: 0.8;
          line-height: 1.4;
        }

        .substack-item:hover, .substack-item.selected {
          border-color: var(--nyc-orange);
          background: rgba(0, 56, 117, 0.5);
        }

        .post-item:hover {
          border-color: var(--nyc-orange);
          background: rgba(0, 56, 117, 0.5);
          transform: translateX(2px);
        }

        @media (max-width: 1024px) {
          .substacks-layout {
            grid-template-columns: 1fr;
            grid-template-rows: auto 1fr;
            gap: 1rem;
            padding: 1rem;
          }

          .substacks-grid {
            max-height: none;
            gap: 1rem;
            padding: 1rem;
          }

          .posts-grid {
            max-height: none;
            gap: 1rem;
            padding: 1rem;
          }

          .substack-item, .post-item {
            margin-bottom: 0;
            margin-right: 0;
          }
        }

        @media (max-width: 768px) {
          .substacks-layout {
            padding: 0.5rem;
            gap: 0.5rem;
          }

          .substacks-grid, .posts-grid {
            padding: 0.5rem;
            gap: 0.5rem;
          }

          .posts-grid {
            grid-template-columns: 1fr;
          }

          .substack-item, .post-item {
            padding: 0.75rem;
          }

          .substack-item h4 {
            font-size: 0.95rem;
          }

          .post-item h4 {
            font-size: 1rem;
          }

          .post-item p, .substack-item p {
            font-size: 0.85rem;
          }
        }

        @media (max-width: 480px) {
          .substacks-layout {
            padding: 0.25rem;
            gap: 0.25rem;
          }

          .substacks-grid, .posts-grid {
            padding: 0.25rem;
            gap: 0.25rem;
          }

          .substack-item, .post-item {
            padding: 0.5rem;
          }

          .post-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.25rem;
          }
        }
      `}</style>
    </main>
  );
} 