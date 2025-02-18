'use client';
import React, { useState, useEffect } from 'react';

interface TerminalDisplayProps {
  text: string;
}

export function TerminalDisplay({ text }: TerminalDisplayProps) {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(prevText => prevText + text[currentIndex]);
        setCurrentIndex(prevIndex => prevIndex + 1);
      }, 50); // Adjust typing speed here

      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text]);

  return (
    <div className="terminal-display">
      <div className="terminal-text">{displayText}</div>
      <div className="terminal-cursor" />
      <style jsx>{`
        .terminal-display {
          background: rgba(0, 0, 0, 0.9);
          border: 2px solid var(--terminal-color);
          padding: 1rem;
          font-family: var(--font-mono);
          color: var(--terminal-color);
          position: relative;
        }

        .terminal-text {
          white-space: pre-wrap;
        }

        .terminal-cursor {
          position: absolute;
          bottom: 1rem;
          left: 1rem;
          width: 8px;
          height: 16px;
          background-color: var(--terminal-color);
          animation: blink 1s step-end infinite;
        }

        @keyframes blink {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
} 