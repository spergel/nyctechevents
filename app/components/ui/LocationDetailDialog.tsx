import { DetailDialog } from './DetailDialog';
import { Location, getEventsForLocation, getCommunitiesForLocation, getCommunityData, getMainCommunityForLocation } from '@/app/utils/dataHelpers';
import { Event as EventType } from '@/app/types/event';
import { Event as SimpleEvent } from '@/app/types/index';
import React, { useState } from 'react';

interface LocationDetailDialogProps {
  location: Location | null;
  isOpen: boolean;
  onClose: () => void;
  onEventSelect?: (event: SimpleEvent) => void;
  onCommunitySelect?: (communityId: string) => void;
}

export function LocationDetailDialog({ 
  location, 
  isOpen, 
  onClose,
  onEventSelect,
  onCommunitySelect
}: LocationDetailDialogProps) {
  const [activeTab, setActiveTab] = useState<'about' | 'events' | 'communities'>('about');
  
  if (!location) return null;

  const relatedEvents = getEventsForLocation(location.id);
  const relatedCommunities = getCommunitiesForLocation(location.id);
  
  // Get the main community for this location
  const mainCommunity = getMainCommunityForLocation(location);

  const upcomingEvents = relatedEvents
    .filter(event => new Date(event.startDate) >= new Date())
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const pastEvents = relatedEvents
    .filter(event => new Date(event.startDate) < new Date())
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  const handleCommunityClick = (communityId: string) => {
    if (onCommunitySelect) {
      onCommunitySelect(communityId);
    }
  };

  const handleEventClick = (event: EventType) => {
    if (onEventSelect) {
      // Convert the detailed event to a simple event
      const simpleEvent: SimpleEvent = {
        id: event.id,
        name: event.name,
        type: event.type,
        locationId: event.locationId,
        communityId: event.communityId,
        description: event.description,
        startDate: event.startDate,
        endDate: event.endDate,
        category: typeof event.category === 'object' ? [event.category.name] : [event.type],
        metadata: {
          venue: event.metadata?.venue
        }
      };
      onEventSelect(simpleEvent);
    }
  };

  return (
    <DetailDialog
      title={location.name}
      systemId="LOC-DTL-001"
      isOpen={isOpen}
      onClose={onClose}
    >
      <div className="location-detail">
        {/* Tabs Navigation */}
        <div className="detail-tabs">
          <button 
            className={`tab-button ${activeTab === 'about' ? 'active' : ''}`}
            onClick={() => setActiveTab('about')}
          >
            <span className="tab-icon">ⓘ</span> About
          </button>
          <button 
            className={`tab-button ${activeTab === 'events' ? 'active' : ''}`}
            onClick={() => setActiveTab('events')}
          >
            <span className="tab-icon">⚡</span> Events ({relatedEvents.length})
          </button>
          <button 
            className={`tab-button ${activeTab === 'communities' ? 'active' : ''}`}
            onClick={() => setActiveTab('communities')}
          >
            <span className="tab-icon">⌖</span> Communities ({relatedCommunities.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {/* About Tab */}
          {activeTab === 'about' && (
            <div className="about-content">
              {/* Location Header */}
              <div className="location-header-info">
                <div className="type-info">
                  <span className="location-type">{location.type}</span>
                  {location.community_and_location === true && (
                    <span className="dual-badge">Community & Location</span>
                  )}
                </div>
              </div>

              {/* Main Community Section - Enhanced and more prominent */}
              {mainCommunity && (
                <div className="main-community-section">
                  <h3 className="main-community-header">MAIN COMMUNITY</h3>
                  <div className="main-community-card" onClick={() => handleCommunityClick(mainCommunity.id)}>
                    <div className="community-icon-large">
                      {mainCommunity.type === 'Tech' ? '💻' : 
                       mainCommunity.type === 'Art' ? '🎨' : 
                       mainCommunity.type === 'Business' ? '💼' : 
                       mainCommunity.type === 'Education' ? '📚' : 
                       mainCommunity.type === 'Social' ? '🌐' : '⚡'}
                    </div>
                    <div className="community-content">
                      <div className="community-header">
                        <h4 className="community-name">{mainCommunity.name}</h4>
                        <span className="community-type-badge">{mainCommunity.type}</span>
                      </div>
                      <p className="community-description">
                        {mainCommunity.description}
                      </p>
                      {mainCommunity.founded && (
                        <div className="community-meta-info">
                          <span className="meta-label">Founded:</span> 
                          <span className="meta-value">{mainCommunity.founded}</span>
                        </div>
                      )}
                      {mainCommunity.size && (
                        <div className="community-meta-info">
                          <span className="meta-label">Size:</span> 
                          <span className="meta-value">{mainCommunity.size}</span>
                        </div>
                      )}
                      {mainCommunity.membershipType && (
                        <div className="community-meta-info">
                          <span className="meta-label">Membership:</span> 
                          <span className="meta-value">{mainCommunity.membershipType}</span>
                        </div>
                      )}
                      <div className="view-community-btn">
                        VIEW FULL COMMUNITY DETAILS →
                      </div>
                    </div>
                  </div>
                </div>
              )}
            
              {/* Address */}
              <div className="detail-section">
                <h3>ADDRESS</h3>
                <div className="location-address">
                  {location.address}
                  {location.coordinates ? (
                    <a 
                      href={`https://maps.google.com/?q=${location.coordinates.lat},${location.coordinates.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="map-link"
                    >
                      <span className="map-icon">◎</span> View on Google Maps
                    </a>
                  ) : (
                    <a 
                      href={`https://maps.google.com/?q=${encodeURIComponent(location.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="map-link"
                    >
                      <span className="map-icon">◎</span> View on Google Maps
                    </a>
                  )}
                </div>
              </div>

              {/* Description */}
              {location.description && (
                <div className="detail-section">
                  <h3>ABOUT</h3>
                  <div className="location-description">
                    {location.description}
                  </div>
                </div>
              )}

              {/* Main Content Grid */}
              <div className="info-grid">
                <div className="left-column">
                  {/* Amenities */}
                  {location.amenities && location.amenities.length > 0 && (
                    <div className="info-section">
                      <h3>AMENITIES</h3>
                      <div className="amenities-list">
                        {location.amenities.map((amenity, i) => (
                          <div key={i} className="amenity-item">
                            <span className="amenity-icon">✓</span>
                            <span className="amenity-name">{amenity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Additional Info Cards */}
                  <div className="additional-info">
                    {/* Website */}
                    {location.website && (
                      <div className="info-card">
                        <div className="info-icon">⌘</div>
                        <div className="info-content">
                          <h4 className="info-title">Website</h4>
                          <a 
                            href={location.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="link-value"
                          >
                            Visit Website
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="right-column">
                  {/* Tags */}
                  {location.tags && location.tags.length > 0 && (
                    <div className="info-section">
                      <h3>TAGS</h3>
                      <div className="tags-container">
                        {location.tags.map((tag, i) => (
                          <span key={i} className="location-tag">{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Events Tab */}
          {activeTab === 'events' && (
            <div className="events-content">
              {upcomingEvents.length > 0 && (
                <div className="events-section">
                  <h3>UPCOMING EVENTS</h3>
                  <div className="events-list">
                    {upcomingEvents.map(event => (
                      <div 
                        key={event.id} 
                        className="event-item"
                        onClick={() => handleEventClick(event)}
                      >
                        <div className="event-date">
                          <div className="date-badge small">
                            <span className="month">
                              {new Date(event.startDate).toLocaleString('en-US', { month: 'short' }).toUpperCase()}
                            </span>
                            <span className="day">
                              {new Date(event.startDate).getDate()}
                            </span>
                          </div>
                        </div>
                        <div className="event-info">
                          <h4 className="event-name">{event.name}</h4>
                          <div className="event-meta">
                            <span className="event-time">
                              {new Date(event.startDate).toLocaleString('en-US', { 
                                hour: 'numeric', 
                                minute: 'numeric',
                                hour12: true
                              })}
                            </span>
                            <span className="event-type">{event.type}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pastEvents.length > 0 && (
                <div className="events-section past-events">
                  <h3>PAST EVENTS</h3>
                  <div className="events-list">
                    {pastEvents.slice(0, 5).map(event => (
                      <div 
                        key={event.id} 
                        className="event-item"
                        onClick={() => handleEventClick(event)}
                      >
                        <div className="event-date">
                          <div className="date-badge small past">
                            <span className="month">
                              {new Date(event.startDate).toLocaleString('en-US', { month: 'short' }).toUpperCase()}
                            </span>
                            <span className="day">
                              {new Date(event.startDate).getDate()}
                            </span>
                          </div>
                        </div>
                        <div className="event-info">
                          <h4 className="event-name">{event.name}</h4>
                          <div className="event-meta">
                            <span className="event-time">
                              {new Date(event.startDate).toLocaleString('en-US', { 
                                hour: 'numeric', 
                                minute: 'numeric',
                                hour12: true
                              })}
                            </span>
                            <span className="event-type">{event.type}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {pastEvents.length > 5 && (
                    <div className="more-events">
                      + {pastEvents.length - 5} more past events
                    </div>
                  )}
                </div>
              )}

              {relatedEvents.length === 0 && (
                <div className="no-data">
                  No events found at this location
                </div>
              )}
            </div>
          )}

          {/* Communities Tab */}
          {activeTab === 'communities' && (
            <div className="communities-content">
              {/* Main Community (if it exists) */}
              {mainCommunity && (
                <div className="main-community-section">
                  <h3 className="main-community-header">PRIMARY COMMUNITY</h3>
                  <div className="main-community-card" onClick={() => handleCommunityClick(mainCommunity.id)}>
                    <div className="community-icon-large">
                      {mainCommunity.type === 'Tech' ? '💻' : 
                       mainCommunity.type === 'Art' ? '🎨' : 
                       mainCommunity.type === 'Business' ? '💼' : 
                       mainCommunity.type === 'Education' ? '📚' : 
                       mainCommunity.type === 'Social' ? '🌐' : '⚡'}
                    </div>
                    <div className="community-content">
                      <div className="community-header">
                        <h4 className="community-name">{mainCommunity.name}</h4>
                        <span className="community-type-badge">{mainCommunity.type}</span>
                      </div>
                      <p className="community-description">
                        {mainCommunity.description}
                      </p>
                      <div className="community-meta-grid">
                        {mainCommunity.founded && (
                          <div className="community-meta-info">
                            <span className="meta-label">Founded:</span> 
                            <span className="meta-value">{mainCommunity.founded}</span>
                          </div>
                        )}
                        {mainCommunity.size && (
                          <div className="community-meta-info">
                            <span className="meta-label">Size:</span> 
                            <span className="meta-value">{mainCommunity.size}</span>
                          </div>
                        )}
                        {mainCommunity.membershipType && (
                          <div className="community-meta-info">
                            <span className="meta-label">Membership:</span> 
                            <span className="meta-value">{mainCommunity.membershipType}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Associated Communities */}
              {relatedCommunities.length > 0 ? (
                <div className="associated-communities-section">
                  <h3 className="section-header">EVENTS HOSTED BY OTHER COMMUNITIES</h3>
                  <div className="communities-explanation">
                    These communities have also held events at this location
                  </div>
                  <div className="communities-list">
                    {relatedCommunities.map(community => (
                      <div 
                        key={community.id} 
                        className="community-item"
                        onClick={() => handleCommunityClick(community.id)}
                      >
                        <div className="community-icon">
                          {community.type === 'Tech' ? '💻' : 
                           community.type === 'Art' ? '🎨' : 
                           community.type === 'Business' ? '💼' : 
                           community.type === 'Education' ? '📚' : 
                           community.type === 'Social' ? '🌐' : '⚡'}
                        </div>
                        <div className="community-info">
                          <div className="community-list-header">
                            <h4 className="community-list-name">{community.name}</h4>
                            <span className="community-list-type">{community.type}</span>
                          </div>
                          <p className="community-description-preview">
                            {community.description.substring(0, 120)}
                            {community.description.length > 120 ? '...' : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                mainCommunity ? (
                  <div className="no-associated-communities">
                    <p>No other communities host events at this location</p>
                  </div>
                ) : (
                  <div className="no-data">
                    No communities associated with this location
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .location-detail {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
          font-family: var(--font-mono);
          color: var(--text-color);
        }
        
        .detail-tabs {
          display: flex;
          gap: 0.5rem;
          padding: 0 1rem;
          margin-bottom: 1rem;
          border-bottom: 1px solid rgba(var(--nyc-green-rgb), 0.3);
        }
        
        .tab-button {
          background: none;
          border: none;
          color: var(--nyc-green);
          font-family: var(--font-mono);
          font-size: 0.9rem;
          padding: 0.5rem 1rem;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        
        .tab-button.active {
          color: var(--nyc-orange);
        }
        
        .tab-button.active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background-color: var(--nyc-orange);
        }
        
        .tab-icon {
          font-size: 1rem;
        }
        
        .tab-content {
          overflow-y: auto;
          padding: 0 1rem 1rem;
          flex: 1;
        }
        
        .about-content, .events-content, .communities-content {
          height: 100%;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .location-header-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          margin-bottom: 1rem;
          padding: 1rem;
          background: rgba(var(--nyc-green-rgb), 0.05);
          border: 1px solid rgba(var(--nyc-green-rgb), 0.2);
        }
        
        .type-and-founded {
          display: flex;
          justify-content: space-between;
        }
        
        .location-type {
          text-transform: uppercase;
          color: var(--nyc-green);
          font-weight: bold;
          font-size: 0.9rem;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
        }
        
        .info-section {
          padding: 1rem;
          background: rgba(var(--nyc-blue-rgb), 0.05);
          border: 1px solid rgba(var(--nyc-blue-rgb), 0.2);
        }
        
        .info-section h3 {
          font-size: 0.9rem;
          color: var(--nyc-blue);
          margin-bottom: 0.75rem;
          font-weight: bold;
        }
        
        .info-items {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 0.75rem;
        }
        
        .info-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        
        .info-label {
          font-size: 0.75rem;
          color: var(--terminal-color);
          text-transform: uppercase;
        }
        
        .info-value {
          font-size: 0.9rem;
        }
        
        .event-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        
        .event-item {
          padding: 0.75rem;
          background: rgba(var(--nyc-blue-rgb), 0.05);
          border: 1px solid rgba(var(--nyc-blue-rgb), 0.2);
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .event-item:hover {
          background: rgba(var(--nyc-blue-rgb), 0.1);
          border-color: rgba(var(--nyc-blue-rgb), 0.3);
        }
        
        .amenity-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.25rem;
        }
        
        .amenity-tag {
          font-size: 0.8rem;
          padding: 0.2rem 0.5rem;
          background: rgba(0, 56, 117, 0.15);
          border: 1px solid rgba(0, 56, 117, 0.3);
          color: var(--nyc-white);
        }
        
        .more-amenities {
          font-size: 0.8rem;
          color: var(--terminal-color);
        }
        
        .no-data {
          padding: 2rem;
          text-align: center;
          color: var(--terminal-color);
          background: rgba(0, 20, 40, 0.3);
          border: 1px dashed rgba(0, 56, 117, 0.5);
        }
        
        @media (min-width: 768px) {
          .info-grid {
            grid-template-columns: 1fr 1fr;
          }
          
          .left-column, .right-column {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }
        }
        
        @media (max-width: 767px) {
          .detail-tabs {
            padding: 0.5rem 0;
          }
          
          .tab-button {
            padding: 0.4rem 0.5rem;
            font-size: 0.8rem;
          }
          
          .info-items {
            grid-template-columns: 1fr;
          }
          
          .event-item {
            padding: 0.5rem;
          }
        }

        .location-community-association {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: rgba(var(--nyc-green-rgb), 0.1);
          border: 1px solid var(--nyc-green);
          margin-bottom: 0.75rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .location-community-association:hover {
          background: rgba(var(--nyc-green-rgb), 0.2);
        }

        .association-icon {
          font-size: 1.25rem;
          color: var(--nyc-green);
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 32px;
          height: 32px;
          background: rgba(var(--nyc-blue-rgb), 0.1);
          border-radius: 4px;
        }

        .association-description {
          color: var(--text-color);
          font-size: 0.9rem;
          margin-top: 0.5rem;
          line-height: 1.4;
        }

        .main-community-section {
          margin-bottom: 1.5rem;
        }

        .main-community-header {
          font-size: 1.1rem;
          font-weight: bold;
          color: var(--nyc-green);
          margin-bottom: 0.75rem;
          border-bottom: 1px solid rgba(var(--nyc-green-rgb), 0.3);
          padding-bottom: 0.5rem;
        }

        .main-community-card {
          display: flex;
          gap: 1rem;
          padding: 1.25rem;
          background: rgba(var(--nyc-green-rgb), 0.08);
          border: 1px solid var(--nyc-green);
          border-radius: 4px;
          transition: all 0.2s;
          cursor: pointer;
        }

        .main-community-card:hover {
          background: rgba(var(--nyc-green-rgb), 0.12);
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        .community-icon-large {
          font-size: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 60px;
          height: 60px;
          background: rgba(var(--nyc-blue-rgb), 0.1);
          border: 1px solid rgba(var(--nyc-blue-rgb), 0.2);
          border-radius: 50%;
          color: var(--nyc-green);
        }

        .community-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .community-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
        }

        .community-name {
          font-size: 1.2rem;
          font-weight: bold;
          color: var(--nyc-white);
          margin: 0;
        }

        .community-type-badge {
          font-size: 0.8rem;
          padding: 0.25rem 0.5rem;
          background: rgba(var(--nyc-blue-rgb), 0.15);
          border: 1px solid rgba(var(--nyc-blue-rgb), 0.3);
          border-radius: 4px;
          color: var(--nyc-green);
          white-space: nowrap;
        }

        .community-description {
          color: var(--text-color);
          font-size: 0.95rem;
          line-height: 1.5;
          margin: 0;
        }

        .community-meta-info {
          display: flex;
          gap: 0.5rem;
          font-size: 0.9rem;
        }

        .meta-label {
          color: var(--terminal-color);
          font-weight: bold;
        }

        .meta-value {
          color: var(--nyc-white);
        }

        .view-community-btn {
          align-self: flex-end;
          margin-top: 0.5rem;
          font-size: 0.85rem;
          color: var(--nyc-green);
          font-weight: bold;
          transition: color 0.2s;
        }

        .main-community-card:hover .view-community-btn {
          color: var(--nyc-orange);
        }

        .main-community {
          background: rgba(var(--nyc-green-rgb), 0.1);
          border: 1px solid var(--nyc-green);
        }

        .main-community:hover {
          background: rgba(var(--nyc-green-rgb), 0.2);
        }

        .associated-communities-section {
          margin-top: 2rem;
        }

        .section-header {
          font-size: 1.1rem;
          font-weight: bold;
          color: var(--terminal-color);
          margin-bottom: 0.5rem;
          border-bottom: 1px solid rgba(var(--nyc-blue-rgb), 0.3);
          padding-bottom: 0.5rem;
        }
        
        .communities-explanation {
          font-size: 0.9rem;
          color: var(--terminal-color);
          margin-bottom: 1rem;
          font-style: italic;
        }
        
        .community-meta-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 0.5rem;
          margin-top: 0.5rem;
        }
        
        .communities-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-top: 0.75rem;
        }
        
        .community-item {
          display: flex;
          gap: 0.75rem;
          padding: 1rem;
          background: rgba(var(--nyc-blue-rgb), 0.08);
          border: 1px solid rgba(var(--nyc-blue-rgb), 0.2);
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .community-item:hover {
          background: rgba(var(--nyc-blue-rgb), 0.12);
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        
        .community-icon {
          font-size: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 45px;
          height: 45px;
          background: rgba(var(--nyc-blue-rgb), 0.1);
          border: 1px solid rgba(var(--nyc-blue-rgb), 0.2);
          border-radius: 50%;
          color: var(--terminal-color);
        }
        
        .community-list-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }
        
        .community-list-name {
          font-size: 1.1rem;
          font-weight: bold;
          color: var(--nyc-white);
          margin: 0;
        }
        
        .community-list-type {
          font-size: 0.8rem;
          padding: 0.2rem 0.5rem;
          background: rgba(var(--terminal-color-rgb), 0.15);
          border: 1px solid rgba(var(--terminal-color-rgb), 0.3);
          border-radius: 4px;
          color: var(--terminal-color);
          white-space: nowrap;
        }
        
        .no-associated-communities {
          margin-top: 1.5rem;
          padding: 1rem;
          background: rgba(var(--nyc-blue-rgb), 0.05);
          border: 1px dashed rgba(var(--nyc-blue-rgb), 0.2);
          border-radius: 4px;
          text-align: center;
          color: var(--terminal-color);
        }

        .location-address {
          font-size: 0.9rem;
          line-height: 1.4;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        
        .map-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--nyc-cyan);
          text-decoration: none;
          font-family: var(--font-mono);
          font-size: 0.9rem;
          padding: 0.5rem;
          border: 1px solid var(--nyc-cyan);
          border-radius: 4px;
          transition: all 0.2s ease;
          width: fit-content;
        }
        
        .map-link:hover {
          background-color: rgba(0, 255, 255, 0.1);
          color: var(--nyc-orange);
          border-color: var(--nyc-orange);
        }
        
        .map-icon {
          font-size: 1rem;
        }
      `}</style>
    </DetailDialog>
  );
} 