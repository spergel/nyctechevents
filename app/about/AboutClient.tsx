'use client';
import React from 'react';
import { Panel } from '@/app/components/ui/Panel';

export default function AboutClient() {
  return (
    <div className="about-layout">
      <Panel title="ABOUT ME" systemId="ABOUT-001">
        <div className="about-content">
          <img 
            src="/profile.png" // Corrected path for Next.js public directory
            alt="Joshua Spergel" 
            className="profile-image"
          />
          <h1>Joshua Spergel</h1>
          <p>
            Hi there! I'm Joshua Spergel, and I live near New York City. 
            I have a passion for web scraping, particularly for finding and organizing events.
          </p>
          
          <h2>My Projects</h2>
          <p>
            I run a couple of websites focused on events in NYC:
          </p>
          <ul>
            <li>
              <a href="https://somethingtodo.nyc" target="_blank" rel="noopener noreferrer">
                somethingtodo.nyc
              </a> - Your go-to source for events happening in the city.
            </li>
            <li>
              (Soon) 
              <a href="https://kids.somethingtodo.nyc" target="_blank" rel="noopener noreferrer">
                kids.somethingtodo.nyc
              </a> - A new site dedicated to events for kids.
            </li>
          </ul>
          
          <h2>Get In Touch</h2>
          <ul>
            <li>
              <strong>Email:</strong> <a href="mailto:spergel.joshua@gmail.com">spergel.joshua@gmail.com</a>
            </li>
            <li>
              <strong>Personal Website:</strong> <a href="https://spergel.github.io" target="_blank" rel="noopener noreferrer">spergel.github.io</a>
            </li>
          </ul>
        </div>
      </Panel>
      <style jsx>{`
        .about-layout {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          width: 100%;
          max-width: 900px; /* Adjusted for typical about page content */
          margin: 2rem auto; /* Centered with some top margin */
          font-family: var(--font-sans); /* Assuming a sans-serif font for readability */
        }

        .about-content {
          padding: 1.5rem;
          background: rgba(0, 20, 40, 0.5); /* Similar to previous style */
          border: 1px solid var(--terminal-color);
          color: var(--terminal-color);
          line-height: 1.7;
        }

        .profile-image {
          display: block;
          width: 150px;
          height: 150px;
          border-radius: 50%; /* Circular image */
          object-fit: cover;
          margin: 0 auto 1.5rem auto; /* Centered */
          border: 3px solid var(--nyc-orange); /* Accent color */
        }

        .about-content h1 {
          color: var(--nyc-white);
          font-size: 2rem;
          text-align: center;
          margin-bottom: 0.5rem;
        }
        
        .about-content h2 {
          color: var(--nyc-orange); /* Accent color for headings */
          font-size: 1.5rem;
          margin-top: 2rem;
          margin-bottom: 1rem;
          border-bottom: 1px solid var(--terminal-color);
          padding-bottom: 0.3rem;
        }

        .about-content p {
          font-size: 1rem;
          margin-bottom: 1rem;
        }

        .about-content ul {
          list-style: none; /* Or 'disc' if you prefer bullets */
          padding-left: 0;
          margin-bottom: 1rem;
        }

        .about-content li {
          margin-bottom: 0.5rem;
          font-size: 1rem;
        }

        .about-content a {
          color: var(--nyc-orange);
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .about-content a:hover {
          color: var(--nyc-white);
          text-decoration: underline;
        }

        @media (max-width: 768px) {
          .about-layout {
            padding: 0.5rem;
            margin: 1rem auto;
          }
          .profile-image {
            width: 120px;
            height: 120px;
          }
          .about-content h1 {
            font-size: 1.8rem;
          }
          .about-content h2 {
            font-size: 1.3rem;
          }
        }
      `}</style>
    </div>
  );
} 