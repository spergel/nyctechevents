'use client';
import React, { useCallback, useState } from 'react';

export function MainframeHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const playButtonSound = useCallback(() => {
    const audio = new Audio('/sounds/button-click.mp3');
    audio.volume = 0.2;
    audio.play().catch(() => {
      // Silently fail if audio can't play
    });
  }, []);

  const toggleMenu = useCallback(() => {
    setIsMenuOpen(!isMenuOpen);
    playButtonSound();
  }, [isMenuOpen, playButtonSound]);

  return (
    <header className="mainframe-header">
      <div className="mainframe-status">
      </div>

      <div className="mainframe-container">
        <div className="mainframe-title">
          <div className="mainframe-controls">
            <button 
              className="mainframe-button minimize"
              aria-label="minimize"
              onClick={playButtonSound}
            >
              <div className="button-symbol">⌬</div>
            </button>
            <button 
              className="mainframe-button maximize"
              aria-label="maximize"
              onClick={playButtonSound}
            >
              <div className="button-symbol">⎔</div>
            </button>
            <button 
              className="mainframe-button close"
              aria-label="close"
              onClick={playButtonSound}
            >
              <div className="button-symbol">⊗</div>
            </button>
          </div>
          <div className="title-container">
            <div className="mainframe-label">NYC DIRECTORY</div>
            <div className="mainframe-value">SYSTEM v1.0</div>
          </div>
          <a
            href="/api/rss"
            target="_blank"
            rel="noopener noreferrer"
            className="header-rss-button"
            title="Subscribe to RSS feed"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.1V10.1Z"/>
            </svg>
            <span className="rss-label">RSS</span>
          </a>
          <button 
            className={`burger-menu ${isMenuOpen ? 'active' : ''}`}
            onClick={toggleMenu}
            aria-label="toggle menu"
          >
            <div className="burger-line"></div>
            <div className="burger-line"></div>
            <div className="burger-line"></div>
            <div className="menu-glow"></div>
          </button>
        </div>
        <nav className={`mainframe-nav ${isMenuOpen ? 'open' : ''}`}>
          <div className="nav-grid">
            <a href="/" className="mainframe-link" onClick={playButtonSound}>
              <span className="link-icon">⌂</span>
              <span className="link-text">Home</span>
            </a>
            <a href="/events" className="mainframe-link" onClick={playButtonSound}>
              <span className="link-icon">◈</span>
              <span className="link-text">Events</span>
            </a>
            <a href="/communities" className="mainframe-link" onClick={playButtonSound}>
              <span className="link-icon">⬡</span>
              <span className="link-text">Communities</span>
            </a>
            <a href="/locations" className="mainframe-link" onClick={playButtonSound}>
              <span className="link-icon">◎</span>
              <span className="link-text">Locations</span>
            </a>
            <a href="/about" className="mainframe-link" onClick={playButtonSound}>
              <span className="link-icon">⎈</span>
              <span className="link-text">About</span>
            </a>
          </div>
        </nav>
      </div>

      <style jsx>{`
        .mainframe-header {
          background: var(--panel-bg);
          border-bottom: 2px solid var(--nyc-orange);
          padding: 0.5rem;
          position: relative;
        }

        .mainframe-status {
          position: absolute;
          top: -1px;
          left: 2rem;
          z-index: 2;
        }

        .status-badge {
          background: var(--nyc-orange);
          color: var(--nyc-blue);
          font-family: var(--font-display);
          font-size: 0.8rem;
          font-weight: bold;
          padding: 0.25rem 1rem;
          border-radius: 0 0 8px 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .mainframe-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 1rem;
        }

        .mainframe-title {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .mainframe-controls {
          display: flex;
          gap: 0.5rem;
        }

        .mainframe-button {
          width: 32px;
          height: 32px;
          border: 2px solid var(--nyc-orange);
          border-radius: 4px;
          background: var(--panel-bg);
          position: relative;
          cursor: pointer;
          padding: 0;
          transition: all 0.1s ease-out;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .button-symbol {
          color: var(--nyc-orange);
          font-size: 1.2rem;
          line-height: 1;
          transition: all 0.1s ease-out;
        }

        .mainframe-button:hover {
          background: rgba(255, 107, 28, 0.1);
        }

        .mainframe-button:active {
          transform: translateY(1px);
          background: rgba(255, 107, 28, 0.2);
        }

        .mainframe-button:active .button-symbol {
          transform: scale(0.9);
        }

        .title-container {
          padding: 0.5rem;
          background: rgba(0, 56, 117, 0.3);
          border: 1px solid var(--nyc-orange);
          border-radius: 4px;
        }

        .mainframe-label {
          color: var(--terminal-color);
          font-family: var(--font-mono);
          font-size: 0.8rem;
          opacity: 0.8;
        }

        .mainframe-value {
          color: var(--nyc-orange);
          font-family: var(--font-display);
          font-size: 1.1rem;
          font-weight: bold;
          letter-spacing: 1px;
        }

        .mainframe-nav {
          display: flex;
          gap: 1rem;
        }

        .nav-grid {
          display: flex;
          gap: 1rem;
        }

        .mainframe-link {
          color: var(--terminal-color);
          text-decoration: none;
          font-family: var(--font-mono);
          font-size: 0.9rem;
          padding: 0.5rem 1rem;
          background: rgba(0, 56, 117, 0.3);
          border: 1px solid transparent;
          border-radius: 4px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .link-icon {
          font-size: 1.1rem;
          color: var(--nyc-orange);
          background:var(--terminal-color);

        }

        .mainframe-link:hover {
          border-color: var(--nyc-orange);
          background: rgba(0, 56, 117, 0.5);
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(255, 107, 28, 0.2);
        }

        .mainframe-link:active {
          transform: translateY(1px);
        }

        .burger-menu {
          display: none;
          flex-direction: column;
          justify-content: space-between;
          width: 32px;
          height: 32px;
          padding: 8px 6px;
          background: var(--panel-bg);
          border: 2px solid var(--nyc-orange);
          border-radius: 4px;
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }

        .burger-line {
          width: 100%;
          height: 2px;
          background: var(--nyc-orange);
          transition: all 0.3s ease;
          position: relative;
          transform-origin: center;
        }

        .menu-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          background: radial-gradient(circle, var(--nyc-orange) 0%, transparent 70%);
          opacity: 0;
          transition: all 0.3s ease;
          transform: translate(-50%, -50%);
        }

        .burger-menu.active .menu-glow {
          width: 150%;
          height: 150%;
          opacity: 0.2;
        }

        .burger-menu.active .burger-line:nth-child(1) {
          transform: translateY(8px) rotate(45deg);
        }

        .burger-menu.active .burger-line:nth-child(2) {
          opacity: 0;
        }

        .burger-menu.active .burger-line:nth-child(3) {
          transform: translateY(-8px) rotate(-45deg);
        }

        @media (max-width: 768px) {
          .mainframe-container {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
          }

          .mainframe-title {
            justify-content: space-between;
          }

          .burger-menu {
            display: flex;
          }

          .mainframe-nav {
            display: none;
            width: 100%;
            overflow: hidden;
            max-height: 0;
            transition: all 0.3s ease-in-out;
          }

          .mainframe-nav.open {
            display: block;
            max-height: 300px;
          }

          .nav-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 0.5rem;
            padding: 0.5rem;
            background: rgba(0, 56, 117, 0.2);
            border-radius: 4px;
            animation: gridFadeIn 0.3s ease-out;
          }

          .mainframe-link {
            padding: 0.75rem;
            justify-content: center;
            font-size: 0.8rem;
            background: rgba(0, 56, 117, 0.4);
            border: 1px solid rgba(255, 107, 28, 0.3);
            position: relative;
            overflow: hidden;
          }

          .mainframe-link::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255, 107, 28, 0.1) 0%, transparent 70%);
            opacity: 0;
            transition: opacity 0.3s ease;
          }

          .mainframe-link:hover::before {
            opacity: 1;
          }

          @keyframes gridFadeIn {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        }

        @media (max-width: 480px) {
          .nav-grid {
            grid-template-columns: 1fr;
          }

          .mainframe-link {
            padding: 0.6rem;
          }
        }

        .header-rss-button {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          margin-left: 1.2rem;
          padding: 0.4rem 0.8rem;
          background: rgba(0, 56, 117, 0.3);
          border: 1.5px solid var(--nyc-orange);
          border-radius: 4px;
          color: #ff6600;
          font-family: var(--font-mono);
          font-size: 0.9rem;
          text-decoration: none;
          transition: all 0.2s;
        }
        .header-rss-button:hover {
          background: rgba(0, 56, 117, 0.5);
          color: #fff;
          border-color: #ff6600;
        }
        .header-rss-button svg {
          color: #ff6600;
        }
        .header-rss-button .rss-label {
          font-weight: bold;
          letter-spacing: 0.05em;
        }
      `}</style>
    </header>
  );
} 