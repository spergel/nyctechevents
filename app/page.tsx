'use client';
import React, { useState, useEffect } from 'react';
import events from '../data/events.json';
import locations from '../data/locations.json';
import { ConsoleLayout } from './components/ui/ConsoleLayout';
import { ConsoleModule } from './components/ui/ConsoleModule';
import { CyberLink } from './components/ui/CyberLink';
import { HolographicDisplay } from './components/ui/HolographicDisplay';
import Loading from './loading';

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if the document is already loaded
    if (document.readyState === 'complete') {
      setIsLoading(false);
    } else {
      // Add event listener for when document loads
      const handleLoad = () => {
        setIsLoading(false);
      };
      window.addEventListener('load', handleLoad);
      
      // Cleanup
      return () => window.removeEventListener('load', handleLoad);
    }
  }, []);

  // Get the next 10 upcoming events
  const upcomingEvents = [...events.events]
    .filter(event => new Date(event.startDate) > new Date())
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 10);

  // Mock community news data
  const communityNews = [
    {
      id: 'news-1',
      title: 'New Tech Hub Opening',
      community: 'NYC Tech Alliance',
      date: '2024-02-20',
      link: '/communities/tech-alliance'
    },
    {
      id: 'news-2',
      title: 'Community Art Exhibition',
      community: 'Brooklyn Artists Collective',
      date: '2024-02-22',
      link: '/communities/brooklyn-artists'
    },
    {
      id: 'news-3',
      title: 'Sustainability Workshop Series',
      community: 'Green NYC Initiative',
      date: '2024-02-25',
      link: '/communities/green-nyc'
    }
  ];

    // Mock Substack posts
    const substackPosts = [
        {
            id: 'post-1',
            title: 'The Future of NYC Transit',
            author: 'John Doe',
            date: '2024-03-01',
            link: '#'
        },
        {
            id: 'post-2',
            title: 'Exploring Green Spaces in the City',
            author: 'Jane Smith',
            date: '2024-02-28',
            link: '#'
        },
        {
            id: 'post-3',
            title: 'NYC\'s Tech Scene Boom',
            author: 'Tech Guru',
            date: '2024-02-26',
            link: '#'
        }
    ];

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="console-page">
      <ConsoleLayout
        locations={locations.locations}
      >
        <ConsoleModule 
          systemId="NYC-001" 
          variant="monitor"
        >
          <HolographicDisplay>
            <img src="/nyc_skyline.gif" alt="NYC Skyline" className="skyline-display" />
          </HolographicDisplay>
        </ConsoleModule>

        <ConsoleModule 
          systemId="DIR-001"
          variant="primary"
        >
          <div className="directory-links">
            <CyberLink href="/events" variant="directory">Events</CyberLink>
            <CyberLink href="/locations" variant="directory">Locations</CyberLink>
            <CyberLink href="/communities" variant="directory">Communities</CyberLink>
          </div>
        </ConsoleModule>

        <ConsoleModule 
          systemId="NEWS-001" 
          variant="monitor"
        >
          <div className="news-feed">
            {[...communityNews, ...communityNews, ...communityNews].map((news, index) => (
              <a
                key={`${news.id}-${index}`}
                href={news.link}
                className="news-item"
              >
                <div className="news-date">{new Date(news.date).toLocaleDateString()}</div>
                <div className="news-title">{news.title}</div>
                <div className="news-community">{news.community}</div>
              </a>
            ))}
          </div>
        </ConsoleModule>

        <ConsoleModule 
          systemId="DATA-003" 
          variant="secondary"
        >
          {upcomingEvents.map(event => (
            <a key={event.id} href={`/events/${event.id}`} className="data-event">
              <span className="event-date">{new Date(event.startDate).toLocaleDateString()}</span>
              <span className="event-name">{event.name}</span>
            </a>
          ))}
        </ConsoleModule>

        <ConsoleModule 
          systemId="INFO-001" 
          variant="secondary"
        >
          {substackPosts.map(post => (
            <a key={post.id} href={post.link} className="info-post">
              <span className="post-date">{new Date(post.date).toLocaleDateString()}</span>
              <span className="post-title">{post.title}</span>
              <span className="post-author">By {post.author}</span>
            </a>
          ))}
        </ConsoleModule>
      </ConsoleLayout>

      <style jsx>{`
        .console-page {
          width: 100%;
          height: calc(100vh - 4rem);
          overflow: hidden;
        }

        .skyline-display {
          width: 100%;
          height: 100%;
          object-fit: cover;
          overflow: hidden;
        }

        .directory-links {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 0.5rem;
          height: 100%;
        }

        .news-feed {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding: 0.5rem;
          text-align: center;
          animation: scrollNews 30s linear infinite;
          height: 100%;
          overflow: hidden;
        }

        .news-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          text-decoration: none;
          transition: all 0.3s ease;
        }

        .news-item:hover {
          transform: scale(1.05);
          text-shadow: 0 0 10px var(--terminal-color);
        }

        .news-date {
          font-family: var(--font-mono);
          font-size: 0.8rem;
          color: var(--nyc-orange);
          opacity: 0.8;
        }

        .news-title {
          font-family: var(--font-display);
          font-size: 1.2rem;
          color: var(--terminal-color);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .news-community {
          font-family: var(--font-mono);
          font-size: 0.9rem;
          color: var(--nyc-white);
          opacity: 0.7;
        }

        .data-event, .info-post {
          display: flex;
          gap: 1rem;
          padding: 0.5rem;
          background: rgba(0, 56, 117, 0.3);
          border: 1px solid transparent;
          text-decoration: none;
          font-family: var(--font-mono);
          transition: all 0.2s ease;
        }

        .data-event {
          color: var(--terminal-color);
          font-size: 0.9rem;
        }

        .info-post {
          flex-direction: column;
          gap: 0.25rem;
          color: var(--terminal-color);
          font-size: 0.8rem;
        }

        .data-event:hover, .info-post:hover {
          border-color: var(--nyc-orange);
          background: rgba(0, 56, 117, 0.5);
          transform: translateX(4px);
        }

        .event-date {
          color: var(--nyc-orange);
          white-space: nowrap;
        }

        .event-name {
          color: var(--nyc-white);
        }

        .post-date {
          color: var(--nyc-orange);
        }

        .post-title {
          color: var(--nyc-white);
          font-weight: bold;
        }

        .post-author {
          color: var(--nyc-white);
          font-style: italic;
        }

        @keyframes scrollNews {
          0% { transform: translateY(0); }
          100% { transform: translateY(-66.67%); }
        }

        @media (max-width: 768px) {
          .skyline-display {
            min-height: 150px;
          }

          .news-feed {
            gap: 0.75rem;
          }

          .news-title {
            font-size: 1rem;
          }

          .news-community {
            font-size: 0.8rem;
          }

          .data-event, .info-post {
            padding: 0.4rem;
          }

          .data-event {
            font-size: 0.8rem;
          }

          .info-post {
            font-size: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}