'use client';
import React from 'react';
import substackPosts from '@/public/data/substackposts.json';

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

export function CommunityNews() {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Get the latest 20 posts
  const latestPosts = substackPosts.posts.slice(0, 20);

  return (
    <div className="community-news">
      {latestPosts.map((post: SubstackPost) => (
        <a
          key={post.id}
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
          className="news-item"
        >
          <div className="news-date">{formatDate(post.post_date)}</div>
          <div className="news-content">
            <h4>{post.title}</h4>
            <div className="news-source">{post.publication}</div>
          </div>
        </a>
      ))}

      <style jsx>{`
        .community-news {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          height: 100%;
          overflow-y: auto;
          padding-right: 0.5rem;
        }

        .news-item {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 1rem;
          padding: 0.75rem;
          background: rgba(0, 20, 40, 0.3);
          border: 1px solid var(--terminal-color);
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .news-item:hover {
          border-color: var(--nyc-orange);
          background: rgba(0, 56, 117, 0.5);
          transform: translateX(4px);
        }

        .news-date {
          color: var(--terminal-color);
          font-family: var(--font-mono);
          font-size: 0.8rem;
          white-space: nowrap;
          opacity: 0.8;
          padding-top: 0.25rem;
        }

        .news-content {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .news-content h4 {
          color: var(--nyc-orange);
          margin: 0;
          font-family: var(--font-display);
          font-size: 1rem;
          line-height: 1.2;
        }

        .news-source {
          color: var(--terminal-color);
          font-family: var(--font-mono);
          font-size: 0.8rem;
          opacity: 0.8;
        }

        .community-news::-webkit-scrollbar {
          width: 6px;
        }

        .community-news::-webkit-scrollbar-track {
          background: var(--panel-bg);
        }

        .community-news::-webkit-scrollbar-thumb {
          background: var(--nyc-orange);
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
} 