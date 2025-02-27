'use client';
import React, { useState, useEffect } from 'react';
import events from '@/public/data/events.json';
import locations from '@/public/data/locations.json';
import { ConsoleLayout } from '@/app/components/ui/ConsoleLayout';
import { ConsoleModule } from '@/app/components/ui/ConsoleModule';
import { CyberLink } from '@/app/components/ui/CyberLink';
import { HolographicDisplay } from '@/app/components/ui/HolographicDisplay';
import Loading from '@/app/loading';

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
            {communityNews.map((news) => (
              <a
                key={news.id}
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
    </div>
  );
}