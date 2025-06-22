'use client';
import React, { useState, useEffect } from 'react';
import communities from '@/public/data/communities.json';
import { Panel } from '@/app/components/ui/Panel';
import { FilterButton } from '@/app/components/ui/FilterButton';
import { FilterDialog } from '@/app/components/ui/FilterDialog';
import { FilterToggleButton } from '@/app/components/ui/FilterToggleButton';
import Loading from '@/app/loading';
import { getEventsForCommunity, getLocationsForCommunity } from '@/app/utils/dataHelpers';
import { Community, Event, Location } from '@/app/types';
import { CommunityDetailDialog } from '@/app/components/ui/CommunityDetailDialog';
import { LocationDetailDialog } from '@/app/components/ui/LocationDetailDialog';
import { EventDetailDialog } from '@/app/components/ui/EventDetailDialog';

interface CommunitiesData {
  communities: Community[];
}

const communitiesData = communities as CommunitiesData;

// Helper function to ensure event has all required fields
const ensureCompleteEvent = (event: any): Event => ({
  ...event,
  category: event.type || '', // Use type as category if not present
  price: event.price || {
    amount: 0,
    type: 'Free',
    currency: 'USD',
    details: ''
  },
  capacity: event.capacity || null,
  registrationRequired: event.registrationRequired || false,
  image: event.image || '',
  status: event.status || 'upcoming',
  metadata: event.metadata || {
    source_url: '',
    featured: false
  },
  endDate: event.endDate || event.startDate // Use startDate as endDate if not present
} as Event);

export default function CommunitiesClient() {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

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

  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const communityTypes = Array.from(new Set(communitiesData.communities.map(c => c.type)))
    .map(type => ({
      id: type,
      name: type,
      count: communitiesData.communities.filter(c => c.type === type).length
    }));

  const filteredCommunities = communitiesData.communities.filter(community =>
    selectedTypes.length === 0 || selectedTypes.includes(community.type)
  );

  const toggleType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  // Filter groups for mobile dialog
  const filterGroups = [
    {
      title: 'COMMUNITY TYPES',
      options: communityTypes,
      selectedIds: selectedTypes,
      onToggle: toggleType
    }
  ];

  const handleCommunityClick = (e: React.MouseEvent, community: Community) => {
    e.preventDefault();
    setSelectedCommunity(community);
  };

  if (isLoading) return <Loading />;

  return (
    <main className="page-layout">


      {/* Mobile Filter Toggle */}
      {isMobile && (
        <FilterToggleButton 
          isActive={isFilterDialogOpen}
          onClick={() => setIsFilterDialogOpen(!isFilterDialogOpen)}
          resultCount={filteredCommunities.length}
        />
      )}

      {/* Mobile Filter Dialog */}
      {isMobile && (
        <FilterDialog
          title="COMMUNITY FILTERS"
          systemId="COM-FIL-001"
          isOpen={isFilterDialogOpen}
          onClose={() => setIsFilterDialogOpen(false)}
          onApply={() => setIsFilterDialogOpen(false)}
          filterGroups={filterGroups}
          resultCount={filteredCommunities.length}
          onClearAll={() => setSelectedTypes([])}
        />
      )}

      <div className="communities-layout">
        {/* Main Content - Communities List */}
        <div className="communities-list">
          <Panel title="NYC COMMUNITIES DIRECTORY" systemId="COM-001">
            <div className="items-grid">
              {filteredCommunities.map((community) => (
                <a 
                  key={community.id} 
                  href={`/communities/${community.id}`} 
                  className="item-card"
                  onClick={(e) => handleCommunityClick(e, community)}
                >
                  <div className="card-header">
                    <div className="header-left">
                      <span className="community-type">{community.type}</span>
                      <span className="community-founded">EST. {community.founded}</span>
                    </div>
                    <div className="header-status" />
                  </div>
                  <div className="community-name">{community.name}</div>
                  <div className="categories-container">
                    {Array.isArray(community.category) ? 
                      community.category.map((cat: string, i: number) => (
                        <span key={i} className="category-tag">{cat}</span>
                      )) : 
                      <span className="category-tag">{community.category}</span>
                    }
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

        {/* Desktop Filters */}
        {!isMobile && (
          <div className="filters-section">
            <Panel title="COMMUNITY TYPES" systemId="TYPE-001" variant="secondary">
              <div className="filters-content">
                <div className="filter-options">
                  {communityTypes.map((type) => (
                    <FilterButton
                      key={type.id}
                      label={type.name}
                      count={type.count}
                      isActive={selectedTypes.includes(type.id)}
                      onClick={() => toggleType(type.id)}
                      variant="compact"
                    />
                  ))}
                </div>
              </div>
            </Panel>
          </div>
        )}
      </div>

      {/* Community Detail Dialog */}
      <CommunityDetailDialog
        community={selectedCommunity}
        isOpen={selectedCommunity !== null}
        onClose={() => setSelectedCommunity(null)}
        onEventSelect={(event) => {
          setSelectedCommunity(null);
          setSelectedEvent(ensureCompleteEvent(event));
        }}
        onLocationSelect={(location) => {
          setSelectedCommunity(null);
          setSelectedLocation(location);
        }}
      />
      
      {/* Location Detail Dialog when a location is selected from the community dialog */}
      <LocationDetailDialog
        location={selectedLocation}
        isOpen={selectedLocation !== null}
        onClose={() => setSelectedLocation(null)}
        onEventSelect={(event) => {
          setSelectedLocation(null);
          setSelectedEvent(ensureCompleteEvent(event));
        }}
      />
      
      {/* Event Detail Dialog when an event is selected */}
      <EventDetailDialog
        event={selectedEvent}
        isOpen={selectedEvent !== null}
        onClose={() => setSelectedEvent(null)}
      />

      <style jsx>{`
        .page-layout {
          display: flex;
          flex-direction: column;
          height: 100vh;
          overflow: hidden;
        }

        .communities-layout {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 1rem;
          padding: 1rem;
          flex: 1;
          min-height: 0;
        }

        .communities-list {
          min-height: 0;
          overflow: hidden;
        }

        .items-grid {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding: 1rem;
          height: 100%;
          overflow-y: auto;
        }

        .item-card {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 1rem;
          background: rgba(0, 56, 117, 0.3);
          border: 1px solid var(--nyc-orange);
          text-decoration: none;
          transition: all 0.2s ease;
          min-height: 150px;
        }

        .item-card:hover {
          transform: translateY(-2px);
          background: rgba(0, 56, 117, 0.5);
          border-color: var(--terminal-color);
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
          overflow-wrap: break-word;
          word-break: break-word;
          white-space: normal;
          line-height: 1.3;
        }

        .categories-container {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          margin-bottom: 0.5rem;
        }

        .category-tag {
          font-size: 0.7rem;
          padding: 0.25rem 0.5rem;
          background: rgba(0, 255, 255, 0.1);
          border: 1px solid var(--terminal-color);
          color: var(--terminal-color);
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

        .item-card:hover .dot {
          background: var(--nyc-orange);
          opacity: 1;
        }

        .filters-content {
          padding: 0.75rem;
        }

        .filter-options {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        @media (max-width: 1024px) {
          .communities-layout {
            grid-template-columns: 1fr;
            padding-bottom: 80px;
          }

          .filters-section {
            display: none;
          }

          .items-grid {
            max-height: none;
            overflow: visible;
          }
        }

        @media (max-width: 768px) {
          .communities-layout {
            padding: 0.5rem;
            padding-bottom: 80px;
          }

          .item-card {
            min-height: 120px;
            padding: 0.75rem;
          }

          .community-name {
            font-size: 0.95rem;
            margin-bottom: 0.25rem;
          }

          .categories-container {
            gap: 0.25rem;
            margin-bottom: 0.25rem;
          }

          .category-tag {
            font-size: 0.65rem;
            padding: 0.15rem 0.35rem;
          }
        }

        @media (max-width: 480px) {
          .communities-layout {
            padding: 0.25rem;
            padding-bottom: 80px;
          }

          .item-card {
            min-height: 100px;
            padding: 0.5rem;
          }

          .community-name {
            font-size: 0.9rem;
          }

          .header-left {
            gap: 0.5rem;
          }

          .community-type,
          .community-founded {
            font-size: 0.7rem;
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
        }

        /* Detail Dialog Styles */
        .community-detail {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .detail-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--terminal-color);
        }

        .detail-type,
        .detail-founded {
          font-family: var(--font-mono);
          font-size: 0.9rem;
          color: var(--nyc-orange);
          padding: 0.25rem 0.5rem;
          background: rgba(0, 56, 117, 0.3);
          border: 1px solid var(--terminal-color);
        }

        .detail-description {
          color: var(--nyc-white);
          line-height: 1.6;
          font-size: 0.95rem;
        }

        .detail-stats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1rem;
          background: rgba(0, 56, 117, 0.3);
          border: 1px solid var(--terminal-color);
        }

        .stat-label {
          color: var(--terminal-color);
          font-family: var(--font-mono);
          font-size: 0.8rem;
          text-transform: uppercase;
        }

        .stat-value {
          color: var(--nyc-orange);
          font-family: var(--font-display);
          font-size: 1.5rem;
          margin-top: 0.5rem;
        }

        .detail-categories,
        .detail-contact,
        .detail-social {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        h4 {
          color: var(--terminal-color);
          font-family: var(--font-mono);
          font-size: 0.8rem;
          margin: 0;
          text-transform: uppercase;
        }

        .categories-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .contact-info,
        .social-links {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .contact-link,
        .social-link {
          font-family: var(--font-mono);
          font-size: 0.9rem;
          color: var(--terminal-color);
          padding: 0.5rem 1rem;
          background: rgba(0, 56, 117, 0.3);
          border: 1px solid var(--terminal-color);
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .contact-link:hover,
        .social-link:hover {
          background: rgba(0, 56, 117, 0.5);
          border-color: var(--nyc-orange);
          color: var(--nyc-orange);
        }

        /* Additional Detail Dialog Styles */
        .tags-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .tag {
          font-size: 0.8rem;
          padding: 0.25rem 0.5rem;
          background: rgba(0, 255, 255, 0.1);
          border: 1px solid var(--terminal-color);
          color: var(--terminal-color);
          text-transform: capitalize;
        }

        .membership-info {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 1rem;
          background: rgba(0, 56, 117, 0.3);
          border: 1px solid var(--terminal-color);
        }

        .membership-type,
        .membership-fee {
          color: var(--nyc-orange);
          font-family: var(--font-mono);
          font-size: 0.9rem;
        }
      `}</style>
    </main>
  );
} 