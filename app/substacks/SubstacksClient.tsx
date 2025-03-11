'use client';
import React, { useState } from 'react';
import substacks from '@/public/data/substacks.json';
import substackPosts from '@/public/data/substackposts.json';
import { Panel } from '@/app/components/ui/Panel';

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

export default function SubstacksClient() {
  const [activeTab, setActiveTab] = useState<'publications' | 'posts'>('publications');

  // Function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  };

  return (
    <div className="substacks-layout">
      <div className="content-container">
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'publications' ? 'active' : ''}`} 
            onClick={() => setActiveTab('publications')}
          >
            PUBLICATIONS
          </button>
          <button 
            className={`tab ${activeTab === 'posts' ? 'active' : ''}`}
            onClick={() => setActiveTab('posts')}
          >
            LATEST POSTS
          </button>
        </div>

        {activeTab === 'publications' && (
          <Panel title="NYC NEWSLETTERS & PUBLICATIONS" systemId="PUB-001">
            <div className="substacks-grid">
              {substacks.substacks.map((stack: Substack) => (
                <a 
                  key={stack.id}
                  href={stack.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="substack-card"
                >
                  <h3 className="substack-name">{stack.name}</h3>
                  <p className="substack-description">{stack.description}</p>
                  <div className="subscription-btn">SUBSCRIBE</div>
                </a>
              ))}
            </div>
          </Panel>
        )}

        {activeTab === 'posts' && (
          <Panel title="LATEST NYC POSTS" systemId="POST-001">
            <div className="posts-grid">
              {substackPosts.posts.map((post: SubstackPost) => (
                <a 
                  key={post.id}
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="post-card"
                >
                  <div className="post-date">{formatDate(post.post_date)}</div>
                  <h3 className="post-title">{post.title}</h3>
                  <div className="post-publication">{post.publication}</div>
                  <p className="post-excerpt">{post.excerpt}</p>
                  <div className="post-footer">
                    <div className="read-more">READ MORE</div>
                  </div>
                </a>
              ))}
            </div>
          </Panel>
        )}
      </div>

      <style jsx>{`
        .substacks-layout {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
        }

        .content-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .tab {
          background: rgba(0, 20, 40, 0.5);
          border: 1px solid var(--terminal-color);
          color: var(--terminal-color);
          padding: 0.5rem 1rem;
          font-family: var(--font-mono);
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .tab:hover {
          background: rgba(0, 56, 117, 0.4);
        }

        .tab.active {
          background: rgba(0, 56, 117, 0.5);
          border-color: var(--nyc-orange);
          color: var(--nyc-orange);
        }

        .substacks-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
          padding: 1rem;
          overflow-y: auto;
        }

        .substack-card {
          background: rgba(0, 20, 40, 0.5);
          border: 1px solid var(--terminal-color);
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 180px;
          transition: all 0.2s ease;
          text-decoration: none;
        }

        .substack-card:hover {
          background: rgba(0, 56, 117, 0.5);
          border-color: var(--nyc-orange);
          transform: translateY(-2px);
        }

        .substack-name {
          color: var(--nyc-white);
          font-size: 1.2rem;
          margin: 0 0 0.75rem 0;
        }

        .substack-description {
          color: var(--terminal-color);
          font-size: 0.9rem;
          line-height: 1.5;
          margin-bottom: 1.5rem;
          flex: 1;
        }

        .subscription-btn {
          align-self: flex-start;
          background: rgba(0, 56, 117, 0.3);
          border: 1px solid var(--terminal-color);
          color: var(--terminal-color);
          padding: 0.5rem 1rem;
          font-family: var(--font-mono);
          font-size: 0.8rem;
          transition: all 0.2s ease;
          margin-top: auto;
        }

        .substack-card:hover .subscription-btn {
          background: rgba(0, 56, 117, 0.5);
          border-color: var(--nyc-orange);
          color: var(--nyc-orange);
        }

        .posts-grid {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding: 1rem;
          overflow-y: auto;
        }

        .post-card {
          background: rgba(0, 20, 40, 0.5);
          border: 1px solid var(--terminal-color);
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          transition: all 0.2s ease;
          text-decoration: none;
        }

        .post-card:hover {
          background: rgba(0, 56, 117, 0.5);
          border-color: var(--nyc-orange);
        }

        .post-date {
          color: var(--terminal-color);
          font-family: var(--font-mono);
          font-size: 0.8rem;
          margin-bottom: 0.5rem;
        }

        .post-title {
          color: var(--nyc-white);
          font-size: 1.2rem;
          margin: 0 0 0.5rem 0;
        }

        .post-publication {
          color: var(--nyc-orange);
          font-family: var(--font-mono);
          font-size: 0.9rem;
          margin-bottom: 1rem;
        }

        .post-excerpt {
          color: var(--terminal-color);
          font-size: 0.95rem;
          line-height: 1.5;
          margin-bottom: 1.5rem;
        }

        .post-footer {
          display: flex;
          justify-content: flex-end;
        }

        .read-more {
          background: rgba(0, 56, 117, 0.3);
          border: 1px solid var(--terminal-color);
          color: var(--terminal-color);
          padding: 0.5rem 1rem;
          font-family: var(--font-mono);
          font-size: 0.8rem;
          transition: all 0.2s ease;
        }

        .post-card:hover .read-more {
          background: rgba(0, 56, 117, 0.5);
          border-color: var(--nyc-orange);
          color: var(--nyc-orange);
        }

        @media (max-width: 768px) {
          .substacks-layout {
            padding: 0.5rem;
          }

          .substacks-grid,
          .posts-grid {
            padding: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
} 