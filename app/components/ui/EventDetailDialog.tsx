import { DetailDialog } from './DetailDialog';
import { getCommunityData, getLocationData } from '@/app/utils/dataHelpers';
import React from 'react';
import { Community, Location, Event } from '@/app/types';
import EventJsonLd from '@/app/components/EventJsonLd';

interface EventDetailDialogProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
  onCommunityClick?: (communityId: string) => void;
  onLocationClick?: (locationId: string) => void;
}

export function EventDetailDialog({ 
  event, 
  isOpen, 
  onClose,
  onCommunityClick,
  onLocationClick
}: EventDetailDialogProps) {
  if (!event) return null;

  const community = event.communityId ? getCommunityData(event.communityId) : undefined;
  const location = event.locationId ? getLocationData(event.locationId) : undefined;
  const venue = event.metadata?.venue;
  const associatedCommunities = event.metadata?.associated_communities || [];
  const associatedCommunityData = associatedCommunities
    .map((id: string) => getCommunityData(id))
    .filter((c): c is Community => c !== undefined);
  const registrationUrl = event.metadata?.source_url;

  const handleCommunityClick = (communityId: string) => {
    if (onCommunityClick) {
      onCommunityClick(communityId);
    }
  };

  const handleLocationClick = () => {
    if (onLocationClick && location) {
      onLocationClick(location.id);
    }
  };

  return (
    <>
      {isOpen && event && <EventJsonLd event={event} />}
      <DetailDialog
        title={event.name}
        systemId="EVT-DTL-001"
        isOpen={isOpen}
        onClose={onClose}
      >
        <div className="event-detail">
          {/* Main Content - single scrollable area */}
          <div className="event-content-scrollable">
            {/* Main Event Info Section */}
            <div className="main-info-grid">
              {/* Left Column - Date & Time */}
              <div className="info-column left-column">
                {/* Date & Time */}
                <div className="detail-section date-time-section">
                  <h3>DATE & TIME</h3>
                  <div className="date-time-layout">
                    <div className="date-badge">
                      <div className="date-badge-month">
                        {new Date(event.startDate).toLocaleString('en-US', { month: 'short' }).toUpperCase()}
                      </div>
                      <div className="date-badge-day">
                        {new Date(event.startDate).getDate()}
                      </div>
                      <div className="date-badge-year">
                        {new Date(event.startDate).getFullYear()}
                      </div>
                    </div>

                    <div className="time-details">
                      <div className="time-row">
                        <div className="time-label">STARTS</div>
                        <div className="time-value">
                          {new Date(event.startDate).toLocaleString('en-US', { 
                            hour: 'numeric', 
                            minute: 'numeric',
                            hour12: true
                          })}
                        </div>
                      </div>
                      
                      {event.endDate && (
                        <div className="time-row">
                          <div className="time-label">ENDS</div>
                          <div className="time-value">
                            {new Date(event.endDate).toLocaleString('en-US', { 
                              hour: 'numeric', 
                              minute: 'numeric',
                              hour12: true
                            })}
                          </div>
                        </div>
                      )}
                      
                      {event.endDate && (
                        <div className="duration-row">
                          {Math.round((new Date(event.endDate).getTime() - new Date(event.startDate).getTime()) / (1000 * 60 * 60))} hrs
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Venue Information */}
                {venue && (
                  <div className="detail-section venue-section">
                    <h3>VENUE</h3>
                    <div className="venue-content">
                      <div className="venue-icon">
                        {venue.type === 'Coworking Space' ? '🏢' :
                         venue.type === 'Cultural Space' ? '🎭' :
                         venue.type === 'Educational Institution' ? '🎓' :
                         venue.type === 'Event Venue' ? '🏛️' :
                         venue.type === 'Community Space' ? '🏠' : '📍'}
                      </div>
                      <div className="venue-details">
                        <h4 className="venue-name">{venue.name}</h4>
                        <p className="venue-address">{venue.address}</p>
                        <div className="venue-actions">
                          {location && (
                            <div className="venue-view-more" onClick={handleLocationClick}>
                              View venue details ⟩
                            </div>
                          )}
                          <a 
                            href={`https://maps.google.com/?q=${encodeURIComponent(venue.address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="venue-map-link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="map-icon">◎</span> Open in Google Maps
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Location Information (if no venue but has location) */}
                {!venue && location && (
                  <div className="detail-section location-section" onClick={handleLocationClick}>
                    <h3>LOCATION</h3>
                    <div className="location-content">
                      <div className="location-icon">
                        {location.type === 'Coworking Space' ? '🏢' :
                         location.type === 'Cultural Space' ? '🎭' :
                         location.type === 'Educational Institution' ? '🎓' :
                         location.type === 'Event Venue' ? '🏛️' :
                         location.type === 'Community Space' ? '🏠' : '📍'}
                      </div>
                      <div className="location-details">
                        <h4 className="location-name">{location.name}</h4>
                        <p className="location-address">{location.address}</p>
                        <div className="venue-actions">
                          <div className="location-view-more">
                            View venue details ⟩
                          </div>
                          <a 
                            href={`https://maps.google.com/?q=${encodeURIComponent(location.address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="venue-map-link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="map-icon">◎</span> Open in Google Maps
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Community & Registration Info */}
              <div className="info-column right-column">
                {/* Community Information */}
                {community && (
                  <div className="detail-section community-summary">
                    <h3>HOSTED BY</h3>
                    <div 
                      className="community-compact"
                      onClick={() => handleCommunityClick(community.id)}
                    >
                      <div className="community-avatar">
                        <div className="community-icon">
                          {community.type === 'Tech' ? '💻' : 
                           community.type === 'Art' ? '🎨' : 
                           community.type === 'Business' ? '💼' : 
                           community.type === 'Education' ? '📚' : 
                           community.type === 'Social' ? '🌐' : 
                           community.type === 'Creative' ? '🎭' : '⚡'}
                        </div>
                      </div>
                      <div className="community-info">
                        <h4 className="community-name">{community.name}</h4>
                        <div className="community-type-badge">{community.type}</div>
                      </div>
                      <div className="view-more-indicator">⟩</div>
                    </div>

                    {/* Associated Communities */}
                    {associatedCommunityData.length > 0 && (
                      <div className="associated-communities">
                        <div className="associated-label">IN PARTNERSHIP WITH</div>
                        {associatedCommunityData.map(assocCommunity => (
                          <div 
                            key={assocCommunity.id}
                            className="community-compact secondary"
                            onClick={() => handleCommunityClick(assocCommunity.id)}
                          >
                            <div className="community-avatar">
                              <div className="community-icon">
                                {assocCommunity.type === 'Tech' ? '💻' : 
                                 assocCommunity.type === 'Art' ? '🎨' : 
                                 assocCommunity.type === 'Business' ? '💼' : 
                                 assocCommunity.type === 'Education' ? '📚' : 
                                 assocCommunity.type === 'Social' ? '🌐' : 
                                 assocCommunity.type === 'Creative' ? '🎭' : '⚡'}
                              </div>
                            </div>
                            <div className="community-info">
                              <h4 className="community-name">{assocCommunity.name}</h4>
                              <div className="community-type-badge">{assocCommunity.type}</div>
                            </div>
                            <div className="view-more-indicator">⟩</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Event Source Link - Always Present */}
                <div className="detail-section registration-section">
                  <h3>VIEW EVENT</h3>
                  <a 
                    href={registrationUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="registration-link"
                    onClick={!registrationUrl ? (e) => e.preventDefault() : undefined}
                  >
                    <div className={`registration-button ${!registrationUrl ? 'disabled' : ''}`}>
                      <span>
                        {registrationUrl ? 'View Original Event' : 'Event Source Unavailable'}
                      </span>
                      {registrationUrl && <span className="external-link-icon">↗</span>}
                    </div>
                  </a>
                </div>

                {/* Calendar Links Only */}
                <div className="detail-section calendar-section">
                  <h3>ADD TO CALENDAR</h3>
                  <div className="calendar-buttons">
                    <a 
                      href={`/api/events/${event.id}/ics`}
                      className="calendar-button"
                      download={`${event.name.replace(/[^a-z0-9]/gi, '_')}.ics`}
                    >
                      <span>Download .ics</span>
                      <span className="download-icon">⬇</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Description - Full Width */}
            {event.description && (
              <div className="detail-section description-section">
                <h3>ABOUT THIS EVENT</h3>
                <div className="event-description" dangerouslySetInnerHTML={{ __html: event.description.replace(/\n/g, '<br/>') }} />
              </div>
            )}
          </div>
        </div>

        <style jsx>{`
          .event-detail {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            padding: 0.5rem;
            position: relative;
            overflow: hidden;
            background: #001639;
            height: 100%;
          }

          /* Grid overlay effect */
          .event-detail::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: 
              linear-gradient(var(--grid-color) 1px, transparent 1px),
              linear-gradient(90deg, var(--grid-color) 1px, transparent 1px);
            background-size: 20px 20px;
            opacity: 0.05;
            pointer-events: none;
          }

          .event-content-scrollable {
            flex: 1;
            overflow-y: auto;
            scrollbar-width: thin;
            scrollbar-color: var(--terminal-color) rgba(0, 20, 40, 0.3);
          }

          .event-content-scrollable::-webkit-scrollbar {
            width: 6px;
          }

          .event-content-scrollable::-webkit-scrollbar-track {
            background: rgba(0, 20, 40, 0.3);
          }

          .event-content-scrollable::-webkit-scrollbar-thumb {
            background-color: var(--terminal-color);
            border-radius: 3px;
          }

          /* Venue Banner */
          .venue-banner {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem;
            background: linear-gradient(90deg, rgba(0, 56, 117, 0.5), rgba(0, 20, 40, 0.3));
            border-left: 3px solid var(--nyc-orange);
            margin-bottom: 1rem;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .venue-banner:hover {
            background: linear-gradient(90deg, rgba(0, 56, 117, 0.7), rgba(0, 20, 40, 0.5));
          }

          .venue-icon {
            font-size: 1.5rem;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 20, 40, 0.5);
            border-radius: 50%;
            border: 1px solid var(--nyc-orange);
          }

          .venue-info {
            flex: 1;
          }

          .venue-name {
            margin: 0 0 0.25rem 0;
            color: var(--nyc-white);
            font-size: 1.1rem;
          }

          .venue-address {
            margin: 0;
            color: var(--terminal-color);
            font-family: var(--font-mono);
            font-size: 0.9rem;
          }

          .venue-more {
            color: var(--nyc-orange);
            font-family: var(--font-mono);
            font-size: 0.9rem;
          }

          .event-description {
            color: var(--nyc-white);
            font-size: 1rem;
            line-height: 1.6;
            white-space: pre-wrap;
            padding: 0.75rem;
            background: rgba(0, 20, 40, 0.2);
            border: 1px solid rgba(0, 56, 117, 0.2);
          }

          .main-info-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .info-column {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }

          .detail-section {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
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

          .date-time-section {
            background: rgba(0, 56, 117, 0.2);
          }

          .date-time-layout {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 1rem;
          }

          .date-badge {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-width: 80px;
            aspect-ratio: 1;
            padding: 0.5rem;
            background: #00275f;
            border: 1px solid var(--nyc-orange);
          }

          .date-badge-month {
            font-family: var(--font-mono);
            font-size: 0.9rem;
            color: var(--nyc-orange);
            letter-spacing: 0.1em;
          }

          .date-badge-day {
            font-size: 2rem;
            font-weight: bold;
            color: var(--nyc-white);
            line-height: 1;
            margin: 0.25rem 0;
          }

          .date-badge-year {
            font-family: var(--font-mono);
            font-size: 0.8rem;
            color: var(--terminal-color);
            letter-spacing: 0.1em;
          }

          .time-details {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            padding: 0.5rem;
            background: rgba(0, 20, 40, 0.3);
          }

          .time-row {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 1rem;
            padding: 0.5rem 0.75rem;
            background: rgba(0, 56, 117, 0.2);
          }

          .time-label {
            color: var(--nyc-orange);
            font-size: 0.8rem;
            font-family: var(--font-mono);
            font-weight: bold;
          }

          .time-value {
            color: var(--nyc-white);
            font-family: var(--font-mono);
            font-size: 0.9rem;
            text-align: right;
          }

          .duration-row {
            display: flex;
            justify-content: flex-end;
            padding: 0.25rem 0.75rem;
            font-size: 0.9rem;
            color: var(--nyc-orange);
            font-family: var(--font-mono);
          }

          .associated-communities {
            margin-top: 0.75rem;
            padding-top: 0.75rem;
            border-top: 1px solid rgba(0, 56, 117, 0.3);
          }

          .associated-label {
            color: var(--terminal-color);
            font-size: 0.8rem;
            font-family: var(--font-mono);
            margin-bottom: 0.5rem;
          }

          .community-compact,
          .location-compact {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.5rem;
            background: rgba(0, 20, 40, 0.2);
            border: 1px solid rgba(0, 56, 117, 0.3);
            position: relative;
            cursor: pointer;
            transition: background-color 0.2s ease;
          }

          .community-compact:hover, 
          .location-compact:hover {
            background: rgba(0, 56, 117, 0.4);
          }

          .community-compact.secondary {
            margin-top: 0.5rem;
            background: rgba(0, 20, 40, 0.1);
          }

          .community-avatar, 
          .location-icon-wrapper {
            min-width: 40px;
          }

          .community-icon,
          .location-icon {
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.25rem;
            background: rgba(0, 20, 40, 0.5);
            border-radius: 50%;
            border: 1px solid var(--terminal-color);
          }

          .community-info,
          .location-info {
            flex: 1;
          }

          .community-name,
          .location-name {
            margin: 0 0 0.25rem 0;
            color: var(--nyc-white);
            font-size: 1rem;
          }

          .community-type-badge {
            display: inline-block;
            font-size: 0.75rem;
            padding: 0.15rem 0.5rem;
            background: rgba(0, 56, 117, 0.3);
            border: 1px solid var(--terminal-color);
            color: var(--terminal-color);
          }

          .location-address {
            margin: 0;
            font-size: 0.8rem;
            color: var(--terminal-color);
            font-family: var(--font-mono);
          }

          .view-more-indicator {
            position: absolute;
            right: 10px;
            color: var(--nyc-orange);
            font-size: 1.2rem;
            font-weight: bold;
          }

          .registration-section {
            margin-top: 0.5rem;
          }

          .registration-link {
            text-decoration: none;
          }

          .registration-button {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            padding: 0.75rem;
            background: var(--nyc-orange);
            color: var(--nyc-blue);
            font-family: var(--font-mono);
            font-weight: bold;
            font-size: 0.9rem;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .registration-button:hover {
            background: #ff8c4d;
          }

          .registration-button.disabled {
            background: rgba(0, 56, 117, 0.3);
            color: var(--terminal-color);
            cursor: not-allowed;
            opacity: 0.6;
          }

          .registration-button.disabled:hover {
            background: rgba(0, 56, 117, 0.3);
          }

          .external-link-icon {
            font-size: 1.1rem;
          }

          .download-icon {
            font-size: 1.1rem;
          }

          .calendar-buttons {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          .calendar-button {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            padding: 0.75rem;
            background: rgba(0, 56, 117, 0.3);
            color: var(--terminal-color);
            font-family: var(--font-mono);
            font-weight: bold;
            font-size: 0.9rem;
            border: 1px solid var(--terminal-color);
            text-decoration: none;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .calendar-button:hover {
            background: rgba(0, 56, 117, 0.5);
            border-color: var(--nyc-orange);
            color: var(--nyc-orange);
          }

          .location-section,
          .venue-section {
            background: rgba(0, 56, 117, 0.2);
            cursor: pointer;
            transition: background-color 0.2s ease;
          }

          .location-section:hover,
          .venue-section:hover {
            background: rgba(0, 56, 117, 0.4);
          }

          .location-content,
          .venue-content {
            display: flex;
            gap: 1rem;
            padding: 0.5rem;
          }

          .location-icon,
          .venue-icon {
            font-size: 1.5rem;
            width: 40px;
            height: 40px;
            min-width: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 20, 40, 0.5);
            border-radius: 50%;
            border: 1px solid var(--nyc-orange);
          }

          .location-details,
          .venue-details {
            flex: 1;
          }

          .location-name,
          .venue-name {
            margin: 0 0 0.25rem 0;
            color: var(--nyc-white);
            font-size: 1.1rem;
          }

          .location-address,
          .venue-address {
            margin: 0 0 0.5rem 0;
            color: var(--terminal-color);
            font-family: var(--font-mono);
            font-size: 0.9rem;
          }

          .location-view-more,
          .venue-view-more {
            color: var(--nyc-orange);
            font-size: 0.8rem;
            font-family: var(--font-mono);
            margin-top: 0.25rem;
            cursor: pointer;
            text-align: right;
          }

          .venue-actions {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            margin-top: 0.5rem;
          }

          .venue-map-link {
            text-decoration: none;
            color: var(--nyc-cyan);
            font-size: 0.8rem;
            font-family: var(--font-mono);
            display: flex;
            align-items: center;
            gap: 0.25rem;
            transition: color 0.2s ease;
          }

          .venue-map-link:hover {
            color: var(--nyc-orange);
          }

          .map-icon {
            font-size: 1rem;
          }

          .calendar-section {
            margin-top: 0.5rem;
          }

          @media (min-width: 768px) {
            .main-info-grid {
              grid-template-columns: 1fr 1fr;
            }
          }
        `}</style>
      </DetailDialog>
    </>
  );
}

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
    case 'website':
      return handle;
    default:
      return handle;
  }
} 