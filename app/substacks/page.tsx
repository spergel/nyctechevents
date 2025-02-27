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
    <main className="page-layout">
      <div className="two-column-layout substacks-layout">
        <div className="main-section">
          <Panel title="NYC SUBSTACKS" systemId="SUB-001">
            <div className="substacks-list">
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
              <div className="items-grid posts-grid">
                {getPostsForSubstack(selectedSubstack).map((post: SubstackPost) => (
                  <a
                    key={post.id}
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="item-card post-item"
                  >
                    <div className="card-header">
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
        /* All styles have been moved to globals.css */
      `}</style>
    </main>
  );
} 