import { DetailDialog } from './DetailDialog';
import { Community, getLocationsForCommunity, getEventsForCommunity } from '@/app/utils/dataHelpers';
import { Event } from '@/app/types/event';
import { Location } from '@/app/utils/dataHelpers';
import React, { useState } from 'react';

interface CommunityDetailDialogProps {
  community: Community | null;
  isOpen: boolean;
  onClose: () => void;
  onEventSelect?: (event: Event) => void;
  onLocationSelect?: (location: Location) => void;
}

export function CommunityDetailDialog({ 
  community, 
  isOpen, 
  onClose,
  onEventSelect,
  onLocationSelect
}: CommunityDetailDialogProps) {
  const [activeTab, setActiveTab] = useState<'about' | 'events' | 'locations'>('about');
  
  if (!community) return null;

  const relatedEvents = getEventsForCommunity(community.id);
  const relatedLocations = getLocationsForCommunity(community.id);

  const upcomingEvents = relatedEvents
    .filter(event => new Date(event.startDate) >= new Date())
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const pastEvents = relatedEvents
    .filter(event => new Date(event.startDate) < new Date())
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  return (
    <DetailDialog
      title={community.name}
      systemId="COMM-DTL-001"
      isOpen={isOpen}
      onClose={onClose}
    >
      <div className="community-detail">
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
            className={`tab-button ${activeTab === 'locations' ? 'active' : ''}`}
            onClick={() => setActiveTab('locations')}
          >
            <span className="tab-icon">⌖</span> Locations ({relatedLocations.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {/* About Tab */}
          {activeTab === 'about' && (
            <div className="about-content">
              {/* Info Grid */}
              <div className="info-grid">
                <div className="left-column">
                  <div className="info-section">
                    <h3>DETAILS</h3>
                    <div className="info-items">
                      <div className="info-item">
                        <span className="info-label">Founded</span>
                        <span className="info-value">{community.founded}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Size</span>
                        <span className="info-value">{community.size}</span>
                      </div>
                      {community.membershipType && (
                        <div className="info-item">
                          <span className="info-label">Membership</span>
                          <span className="info-value">{community.membershipType}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contact and Social */}
                  {(community.contact || community.website) && (
                    <div className="info-section contact-section">
                      <h3>CONTACT</h3>
                      <div className="contact-links">
                        {community.website && (
                          <a href={community.website} target="_blank" rel="noopener noreferrer" className="contact-box-link website-link">
                            <span className="link-icon">⌘</span> {formatUrl(community.website)}
                          </a>
                        )}
                        {community.contact?.email && (
                          <a href={`mailto:${community.contact.email}`} className="contact-box-link email-link">
                            <span className="link-icon">✉</span> {community.contact.email}
                          </a>
                        )}
                        {community.contact?.phone && (
                          <a href={`tel:${community.contact.phone}`} className="contact-box-link phone-link">
                            <span className="link-icon">☎</span> {community.contact.phone}
                          </a>
                        )}
                      </div>
                      
                      {community.contact?.social && (
                        <div className="social-links">
                          {Object.entries(community.contact.social).map(([platform, handle]) => (
                            <a 
                              key={platform}
                              href={getSocialLink(platform, handle as string)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="contact-box-link social-link"
                            >
                              <span className="social-icon">
                                {platform === 'instagram' ? '◈' : 
                                 platform === 'twitter' ? '◇' : 
                                 platform === 'facebook' ? '⬡' : 
                                 platform === 'discord' ? '⬢' : 
                                 platform === 'matrix' ? '◰' : 
                                 platform === 'linkedin' ? '◫' : '◎'}
                              </span>
                              {platform}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="right-column">
                  {/* About section */}
                  <div className="detail-section">
                    <h3>ABOUT</h3>
                    <div className="community-description">
                      {community.description}
                    </div>
                  </div>
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
                        onClick={() => onEventSelect && onEventSelect(event)}
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
                        onClick={() => onEventSelect && onEventSelect(event)}
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
                  No events found for this community
                </div>
              )}
            </div>
          )}

          {/* Locations Tab */}
          {activeTab === 'locations' && (
            <div className="locations-content">
              <h3>LOCATIONS</h3>
              <div className="locations-list">
                {relatedLocations.map(location => (
                  <div 
                    key={location.id} 
                    className="location-item"
                    onClick={() => onLocationSelect && onLocationSelect(location)}
                  >
                    <div className="location-icon">
                      {location.type === 'Coworking Space' ? '🏢' :
                       location.type === 'Cultural Space' ? '🎭' :
                       location.type === 'Educational Institution' ? '🎓' :
                       location.type === 'Event Venue' ? '🏛️' :
                       location.type === 'Community Space' ? '🏠' : '📍'}
                    </div>
                    <div className="location-info">
                      <h4 className="location-name">{location.name}</h4>
                      <div className="location-meta">
                        <span className="location-type">{location.type}</span>
                        <span className="location-address">{location.address}</span>
                      </div>
                      {location.amenities && location.amenities.length > 0 && (
                        <div className="location-amenities">
                          {location.amenities.slice(0, 3).map((amenity, i) => (
                            <span key={i} className="amenity-tag">{amenity}</span>
                          ))}
                          {location.amenities.length > 3 && (
                            <span className="more-amenities">+{location.amenities.length - 3} more</span>
                          )}
                        </div>
                      )}
                      <div className="view-location-btn">VIEW LOCATION DETAILS →</div>
                    </div>
                  </div>
                ))}
              </div>
              {relatedLocations.length === 0 && (
                <div className="no-data">
                  No locations found for this community
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .community-detail {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding: 0.75rem;
          background: #001639;
          height: 100%;
        }

        .community-header-info {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem;
          margin-bottom: 0.5rem;
          background: rgba(0, 20, 40, 0.5);
          border-left: 3px solid var(--nyc-orange);
        }

        .type-and-founded {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .community-type, 
        .community-founded,
        .organization-type {
          font-size: 0.85rem;
          padding: 0.25rem 0.75rem;
          background: rgba(0, 56, 117, 0.3);
          color: var(--terminal-color);
        }

        .organization-type {
          color: var(--nyc-orange);
          border: 1px solid var(--nyc-orange);
        }

        .detail-tabs {
          display: flex;
          gap: 0.5rem;
          padding: 0.5rem;
          background: rgba(0, 20, 40, 0.3);
          border-bottom: 1px solid rgba(0, 56, 117, 0.4);
          overflow-x: auto;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .tab-button {
          background: rgba(0, 56, 117, 0.3);
          border: 1px solid rgba(0, 56, 117, 0.5);
          color: var(--terminal-color);
          padding: 0.5rem 0.75rem;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: var(--font-mono);
        }

        .tab-button:hover {
          background: rgba(0, 56, 117, 0.5);
          border-color: var(--terminal-color);
        }

        .tab-button.active {
          background: rgba(0, 56, 117, 0.6);
          border-color: var(--nyc-orange);
          color: var(--nyc-white);
        }

        .tab-icon {
          font-size: 1rem;
          color: var(--nyc-orange);
        }

        .tab-content {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding: 0.5rem;
          flex: 1;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: var(--terminal-color) rgba(0, 20, 40, 0.3);
        }

        .tab-content::-webkit-scrollbar {
          width: 6px;
        }

        .tab-content::-webkit-scrollbar-track {
          background: rgba(0, 20, 40, 0.3);
        }

        .tab-content::-webkit-scrollbar-thumb {
          background-color: var(--terminal-color);
          border-radius: 3px;
        }

        .detail-section {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding: 0.75rem;
          background: rgba(0, 20, 40, 0.3);
          border-left: 3px solid var(--terminal-color);
        }

        .detail-section h3 {
          color: var(--nyc-orange);
          font-family: var(--font-mono);
          font-size: 0.9rem;
          margin: 0;
          letter-spacing: 0.05em;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .detail-section h3::before {
          content: '>';
          color: var(--nyc-orange);
        }

        .community-description {
          color: var(--nyc-white);
          line-height: 1.6;
          font-size: 0.95rem;
          padding: 0.75rem;
          background: rgba(0, 56, 117, 0.1);
          border: 1px solid rgba(0, 56, 117, 0.3);
        }

        .info-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
        }

        .info-section {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding: 0.75rem;
          background: rgba(0, 20, 40, 0.3);
          border-left: 3px solid var(--terminal-color);
        }

        .info-items {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 0.75rem;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          padding: 0.75rem;
          background: rgba(0, 56, 117, 0.2);
          border: 1px solid rgba(0, 56, 117, 0.3);
        }

        .info-label {
          color: var(--terminal-color);
          font-size: 0.8rem;
          text-transform: uppercase;
          font-family: var(--font-mono);
        }

        .info-value {
          color: var(--nyc-white);
          font-size: 0.95rem;
        }

        .tags-container {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          padding: 0.5rem;
        }

        .category-tag, .regular-tag {
          font-size: 0.85rem;
          padding: 0.3rem 0.75rem;
          white-space: nowrap;
        }

        .category-tag {
          background: rgba(0, 56, 117, 0.3);
          border: 1px solid var(--terminal-color);
          color: var(--terminal-color);
        }

        .regular-tag {
          background: rgba(0, 56, 117, 0.2);
          border: 1px solid rgba(0, 56, 117, 0.3);
          color: var(--nyc-white);
        }

        .contact-section {
          margin-top: 0.5rem;
        }

        .contact-links, .social-links {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          padding: 0.5rem 0;
        }

        .contact-box-link, .social-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.4rem 0.75rem;
          background: rgba(0, 56, 117, 0.2);
          border: 1px solid rgba(0, 56, 117, 0.3);
          color: var(--nyc-white);
          text-decoration: none;
          font-size: 0.9rem;
          transition: all 0.2s ease;
        }

        .contact-box-link:hover, .social-link:hover {
          background: rgba(0, 56, 117, 0.4);
          border-color: var(--terminal-color);
        }

        .website-link {
          border-color: var(--nyc-orange);
        }

        .link-icon, .social-icon {
          color: var(--nyc-orange);
          font-size: 0.9rem;
        }

        /* Events Tab Styles */
        .events-content {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .events-section {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .events-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .event-item {
          display: flex;
          gap: 0.75rem;
          padding: 0.75rem;
          background: rgba(0, 56, 117, 0.2);
          border: 1px solid rgba(0, 56, 117, 0.3);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .event-item:hover {
          background: rgba(0, 56, 117, 0.4);
          border-color: var(--terminal-color);
        }

        .event-date {
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .date-badge.small {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-width: 60px;
          padding: 0.4rem;
          background: #00275f;
          border: 1px solid var(--nyc-orange);
        }

        .date-badge.small.past {
          background: rgba(0, 20, 40, 0.5);
          border-color: var(--terminal-color);
          opacity: 0.7;
        }

        .date-badge.small .month {
          font-family: var(--font-mono);
          font-size: 0.7rem;
          color: var(--nyc-orange);
          letter-spacing: 0.1em;
        }

        .date-badge.small .day {
          font-size: 1.2rem;
          font-weight: bold;
          color: var(--nyc-white);
          line-height: 1;
          margin: 0.2rem 0;
        }

        .event-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .event-name {
          color: var(--nyc-white);
          margin: 0;
          font-size: 1rem;
        }

        .event-meta {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .event-time {
          color: var(--terminal-color);
          font-size: 0.8rem;
          font-family: var(--font-mono);
        }

        .event-type {
          font-size: 0.8rem;
          padding: 0.2rem 0.5rem;
          background: rgba(0, 56, 117, 0.3);
          border: 1px solid var(--terminal-color);
          color: var(--terminal-color);
        }

        .more-events {
          text-align: center;
          padding: 0.5rem;
          font-size: 0.9rem;
          color: var(--terminal-color);
          background: rgba(0, 20, 40, 0.3);
          border: 1px dashed rgba(0, 56, 117, 0.5);
          margin-top: 0.5rem;
        }

        .past-events .event-name {
          opacity: 0.8;
        }

        /* Locations Tab Styles */
        .locations-content {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .locations-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .location-item {
          display: flex;
          gap: 0.75rem;
          padding: 0.75rem;
          background: rgba(0, 56, 117, 0.2);
          border: 1px solid rgba(0, 56, 117, 0.3);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .location-item:hover {
          background: rgba(0, 56, 117, 0.3);
          border-color: var(--terminal-color);
          transform: translateY(-2px);
        }
        
        .view-location-btn {
          align-self: flex-end;
          margin-top: 0.5rem;
          font-size: 0.85rem;
          color: var(--terminal-color);
          font-weight: bold;
          transition: color 0.2s;
        }
        
        .location-item:hover .view-location-btn {
          color: var(--nyc-orange);
        }

        .location-icon {
          font-size: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 40px;
          height: 40px;
          background: rgba(0, 20, 40, 0.5);
          border-radius: 50%;
          border: 1px solid var(--terminal-color);
        }

        .location-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .location-name {
          color: var(--nyc-white);
          margin: 0;
          font-size: 1rem;
        }

        .location-meta {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
          align-items: center;
        }

        .location-type {
          font-size: 0.8rem;
          padding: 0.2rem 0.5rem;
          background: rgba(0, 56, 117, 0.3);
          border: 1px solid var(--terminal-color);
          color: var(--terminal-color);
        }

        .location-address {
          font-size: 0.85rem;
          color: var(--nyc-orange);
          font-family: var(--font-mono);
        }

        .location-amenities {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
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
      `}</style>
    </DetailDialog>
  );
}

// Helper function for social links
function getSocialLink(platform: string, handle: string): string {
  switch (platform.toLowerCase()) {
    case 'instagram':
      return `https://instagram.com/${handle.replace('@', '')}`;
    case 'twitter':
      return `https://twitter.com/${handle.replace('@', '')}`;
    case 'facebook':
      return `https://facebook.com/${handle}`;
    case 'linkedin':
      return `https://linkedin.com/in/${handle}`;
    case 'discord':
      return handle.startsWith('http') ? handle : `https://discord.gg/${handle}`;
    case 'matrix':
      return `https://matrix.to/#/${handle}`;
    case 'website':
      return handle;
    default:
      return handle;
  }
}

function formatUrl(url: string): string {
  // Remove protocol (http://, https://)
  let formatted = url.replace(/^(https?:\/\/)?(www\.)?/, '');
  
  // Remove trailing slash if present
  formatted = formatted.replace(/\/$/, '');
  
  return formatted;
} 