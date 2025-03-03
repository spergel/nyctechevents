'use client';
import React, { useEffect } from 'react';
import { IoClose } from 'react-icons/io5';
import { useRouter } from 'next/navigation';
import { IoArrowBackOutline } from 'react-icons/io5';

interface DetailDialogProps {
  title: string;
  systemId?: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  backUrl?: string;
}

export function DetailDialog({
  title,
  systemId = 'DETAIL-001',
  isOpen,
  onClose,
  children,
  backUrl
}: DetailDialogProps) {
  const router = useRouter();

  // Close dialog on escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }

    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  // Close dialog when clicking backdrop
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleClose = () => {
    if (backUrl) {
      router.push(backUrl);
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="dialog-backdrop" onClick={handleBackdropClick}>
      <div className="dialog" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <div className="header-content">
            {backUrl && (
              <button className="back-button" onClick={handleClose} aria-label="Go back">
                <IoArrowBackOutline />
                <span className="back-text">BACK</span>
              </button>
            )}
            <div className="system-id">{systemId}</div>
            <h2 className="dialog-title">{title}</h2>
          </div>
          <button className="close-button" onClick={onClose}>
            <IoClose />
            <span className="close-text">CLOSE</span>
          </button>
        </div>
        <div className="dialog-content">
          <div className="content-wrapper">
            {children}
          </div>
        </div>
      </div>

      <style jsx>{`
        .dialog-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(6px);
          animation: fadeIn 0.2s ease-out;
        }

        .dialog {
          width: 90%;
          max-width: 900px;
          max-height: 90vh;
          background: #001639;
          border: 1px solid var(--nyc-orange);
          display: flex;
          flex-direction: column;
          position: relative;
          animation: slideUp 0.3s ease-out;
          overflow: hidden;
        }

        .dialog::before {
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
          opacity: 0.1;
          pointer-events: none;
        }

        .dialog-header {
          background: #00275f;
          color: var(--nyc-white);
          padding: 0.75rem 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--nyc-orange);
          position: relative;
        }

        .dialog-header::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 2px;
          background: var(--nyc-orange);
        }

        .header-content {
          display: flex;
          flex-direction: column;
          justify-content: center;
          position: relative;
        }

        .system-id {
          font-family: var(--font-mono);
          font-size: 0.8rem;
          color: var(--terminal-color);
          letter-spacing: 0.1em;
          display: flex;
          align-items: center;
        }

        .system-id::before {
          content: '>';
          color: var(--nyc-orange);
          margin-right: 0.5rem;
        }

        .dialog-title {
          font-family: var(--font-display);
          font-size: 1.5rem;
          margin: 0;
          color: var(--nyc-white);
          letter-spacing: 0.05em;
        }

        .close-button {
          background: rgba(0, 20, 40, 0.5);
          border: 1px solid var(--nyc-orange);
          color: var(--nyc-orange);
          font-size: 1.2rem;
          cursor: pointer;
          padding: 0.4rem 0.6rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .close-text {
          font-size: 0.8rem;
          font-family: var(--font-mono);
          letter-spacing: 0.1em;
        }

        .close-button:hover {
          color: var(--nyc-white);
          border-color: var(--nyc-orange);
        }

        .dialog-content {
          flex: 1;
          overflow-y: auto;
          padding: 0;
        }

        .content-wrapper {
          flex: 1;
          overflow-y: auto;
          max-height: calc(90vh - 70px);
          scrollbar-width: thin;
          scrollbar-color: var(--terminal-color) rgba(0, 20, 40, 0.3);
        }

        .content-wrapper::-webkit-scrollbar {
          width: 8px;
        }

        .content-wrapper::-webkit-scrollbar-track {
          background: rgba(0, 20, 40, 0.3);
        }

        .content-wrapper::-webkit-scrollbar-thumb {
          background: var(--terminal-color);
          border-radius: 4px;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        @media (max-width: 768px) {
          .dialog {
            width: 95%;
            max-height: 95vh;
          }
          
          .close-text {
            display: none;
          }
        }

        .back-button {
          position: absolute;
          top: 0;
          left: -40px;
          display: flex;
          align-items: center;
          background: none;
          border: none;
          color: var(--nyc-green);
          cursor: pointer;
          font-family: var(--font-mono);
          font-size: 0.8rem;
          padding: 0.25rem 0.5rem;
          transition: color 0.2s;
        }
        
        .back-button:hover {
          color: var(--nyc-orange);
        }
        
        .back-text {
          margin-left: 0.25rem;
        }
      `}</style>
    </div>
  );
} 