'use client';
import React, { useState, useEffect } from 'react';
import { FilterButton } from './FilterButton';
import { CyberDatePicker } from './CyberDatePicker';

interface FilterOption {
  id: string;
  name: string;
  count?: number;
  subcategories?: FilterOption[];
}

interface FilterDialogProps {
  title: string;
  systemId?: string;
  isOpen: boolean;
  onClose: () => void;
  filterGroups: {
    title: string;
    options: FilterOption[];
    selectedIds: string[];
    onToggle: (id: string) => void;
    layout?: 'grid' | 'list';
  }[];
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  resultCount?: number;
  onClearAll?: () => void;
  variant?: 'primary' | 'secondary';
  startDate?: Date | null;
  endDate?: Date | null;
  onStartDateChange?: (date: Date | null) => void;
  onEndDateChange?: (date: Date | null) => void;
}

export function FilterDialog({
  title,
  systemId = 'FILTER-001',
  isOpen,
  onClose,
  filterGroups,
  searchQuery = '',
  onSearchChange,
  resultCount,
  onClearAll,
  variant = 'secondary',
  startDate = null,
  endDate = null,
  onStartDateChange,
  onEndDateChange
}: FilterDialogProps) {
  const [isMobile, setIsMobile] = useState(false);

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

  // Handle body scroll locking when dialog is open on mobile
  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile, isOpen]);

  if (!isOpen && isMobile) return null;

  return (
    <>
      {isMobile && isOpen && (
        <div className="filter-dialog-backdrop" onClick={onClose} />
      )}
      <div className={`filter-dialog ${isMobile ? 'mobile' : 'desktop'} ${isOpen ? 'open' : ''}`}>
        <div className="filter-dialog-content">
          {isMobile && (
            <div className="mobile-header">
              <h2 className="mobile-title">{title}</h2>
              <button 
                className="mobile-close"
                onClick={onClose}
                aria-label="Close filters"
              >
                <span className="close-icon">×</span>
              </button>
            </div>
          )}
          
          <div className="filters-content">
            {/* Search Bar */}
            {onSearchChange && (
              <div className="filter-group search-group">
                <h3 className="filter-title">SEARCH</h3>
                <div className="search-container">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search..."
                    className="search-input"
                  />
                  <div className="search-icon">⌕</div>
                </div>
              </div>
            )}

            {/* Date Range Filters */}
            {onStartDateChange && onEndDateChange && (
              <div className="filter-group">
                <h3 className="filter-title">DATE RANGE</h3>
                <div className="date-filters">
                  <CyberDatePicker
                    selectedDate={startDate}
                    onChange={onStartDateChange}
                    label="Start Date"
                    placeholder="FROM"
                  />
                  <CyberDatePicker
                    selectedDate={endDate}
                    onChange={onEndDateChange}
                    label="End Date"
                    placeholder="TO"
                  />
                </div>
              </div>
            )}

            {/* Filter Groups */}
            {filterGroups.map((group, index) => (
              <div key={index} className="filter-group">
                <h3 className="filter-title">{group.title}</h3>
                <div className={`filter-options ${group.layout === 'grid' ? 'filter-options-grid' : ''}`}>
                  {group.options.map((option) => (
                    <FilterButton
                      key={option.id}
                      label={option.name}
                      count={option.count}
                      isActive={group.selectedIds.includes(option.id)}
                      onClick={() => group.onToggle(option.id)}
                    />
                  ))}
                </div>
                
                {/* Subcategories */}
                {group.options.some(option => 
                  option.subcategories?.length && group.selectedIds.includes(option.id)
                ) && (
                  <div className="subcategories">
                    {group.options
                      .filter(option => group.selectedIds.includes(option.id) && option.subcategories?.length)
                      .map(option => (
                        <div key={`sub-${option.id}`} className="subcategory-group">
                          <h4 className="subcategory-title">{option.name} SUBCATEGORIES</h4>
                          <div className="filter-options">
                            {option.subcategories?.map(sub => (
                              <FilterButton
                                key={sub.id}
                                label={sub.name}
                                count={sub.count}
                                isActive={group.selectedIds.includes(sub.id)}
                                onClick={() => group.onToggle(sub.id)}
                              />
                            ))}
                          </div>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Mobile Footer Actions */}
          {isMobile && (
            <div className="mobile-actions">
              <button 
                className="mobile-apply"
                onClick={onClose}
              >
                APPLY FILTERS {resultCount !== undefined && `(${resultCount} RESULTS)`}
              </button>
              {onClearAll && (
                <button 
                  className="mobile-clear"
                  onClick={onClearAll}
                >
                  CLEAR ALL FILTERS
                </button>
              )}
            </div>
          )}
        </div>

        <style jsx>{`
          .filter-dialog-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100vh;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999;
            backdrop-filter: blur(2px);
          }
          
          .filter-dialog {
            background: var(--panel-bg);
            border: 1px solid var(--nyc-orange);
            box-shadow: var(--border-glow);
            position: relative;
            overflow: hidden;
            height: 100%;
            display: flex;
            flex-direction: column;
          }

          .filter-dialog.mobile {
            position: fixed;
            top: 0;
            right: 0;
            width: 100%;
            height: 100vh;
            z-index: 1000;
            background: rgba(0, 20, 40, 0.95);
            transform: translateX(100%);
            transition: transform 0.3s ease;
            visibility: hidden;
            border: none;
          }

          .filter-dialog.mobile.open {
            transform: translateX(0);
            visibility: visible;
          }

          .filter-dialog-content {
            display: flex;
            flex-direction: column;
            height: 100%;
          }

          .mobile-header {
            position: sticky;
            top: 0;
            z-index: 10;
            background: var(--nyc-blue);
            padding: 1rem;
            border-bottom: 1px solid var(--nyc-orange);
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .mobile-title {
            color: var(--nyc-orange);
            font-family: var(--font-display);
            font-size: 1.2rem;
            margin: 0;
          }
          
          .mobile-close {
            background: none;
            border: none;
            color: var(--nyc-orange);
            font-size: 1.5rem;
            cursor: pointer;
          }

          .filters-content {
            flex: 1;
            overflow-y: auto;
            padding: 1rem;
            max-height: calc(100vh - 140px); /* Account for header and footer */
            scrollbar-width: thin;
            scrollbar-color: var(--nyc-orange) rgba(0, 56, 117, 0.3);
          }

          .filters-content::-webkit-scrollbar {
            width: 6px;
          }

          .filters-content::-webkit-scrollbar-track {
            background: rgba(0, 56, 117, 0.3);
          }

          .filters-content::-webkit-scrollbar-thumb {
            background-color: var(--nyc-orange);
            border-radius: 3px;
          }

          .filter-group {
            margin-bottom: 2rem;
            border-bottom: 1px solid rgba(0, 56, 117, 0.3);
            padding-bottom: 1rem;
          }

          .filter-group:last-child {
            border-bottom: none;
          }

          .filter-title {
            font-family: var(--font-mono);
            color: var(--nyc-orange);
            font-size: 0.9rem;
            margin-bottom: 1rem;
            position: sticky;
            top: 0;
            background: rgba(0, 20, 40, 0.95);
            padding: 0.5rem 0;
            z-index: 1;
          }

          .filter-options {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            padding-left: 0;
          }
          
          .filter-options-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.75rem;
            padding-left: 0;
          }

          .subcategory-group {
            margin-top: 1.5rem;
            padding-top: 1rem;
            border-top: 1px dashed rgba(0, 56, 117, 0.5);
          }

          .subcategory-title {
            font-family: var(--font-mono);
            color: var(--terminal-color);
            font-size: 0.8rem;
            margin-bottom: 0.75rem;
          }

          .search-container {
            position: relative;
            width: 100%;
          }

          .search-input {
            width: 100%;
            padding: 0.75rem;
            padding-right: 2.5rem;
            background: rgba(0, 56, 117, 0.3);
            border: 1px solid var(--nyc-orange);
            color: var(--nyc-white);
            font-family: var(--font-mono);
            font-size: 0.9rem;
            transition: all 0.2s ease;
            clip-path: polygon(0 0, 100% 0, 95% 100%, 0 100%);
          }

          .search-input::placeholder {
            color: rgba(255, 255, 255, 0.5);
          }

          .search-input:focus {
            outline: none;
            background: rgba(0, 56, 117, 0.5);
            border-color: var(--terminal-color);
            box-shadow: 0 0 15px rgba(255, 107, 28, 0.2);
          }

          .search-icon {
            position: absolute;
            right: 0.75rem;
            top: 50%;
            transform: translateY(-50%);
            color: var(--nyc-orange);
            font-size: 1.2rem;
            pointer-events: none;
            opacity: 0.8;
          }

          .search-container:focus-within .search-icon {
            color: var(--terminal-color);
          }

          .mobile-actions {
            position: sticky;
            bottom: 0;
            background: var(--nyc-blue);
            padding: 1rem;
            border-top: 1px solid var(--nyc-orange);
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }
          
          .mobile-apply {
            background: var(--nyc-orange);
            color: var(--nyc-blue);
            border: none;
            padding: 0.75rem;
            font-family: var(--font-mono);
            font-weight: bold;
            font-size: 0.9rem;
            cursor: pointer;
            clip-path: polygon(0 0, 100% 0, 95% 100%, 0 100%);
          }
          
          .mobile-clear {
            background: rgba(0, 56, 117, 0.3);
            color: var(--nyc-white);
            border: 1px solid var(--terminal-color);
            padding: 0.5rem;
            font-family: var(--font-mono);
            font-size: 0.8rem;
            cursor: pointer;
          }

          @media (max-width: 768px) {
            .filter-options-grid {
              grid-template-columns: 1fr;
            }
          }

          .date-filters {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }
        `}</style>
      </div>
    </>
  );
} 