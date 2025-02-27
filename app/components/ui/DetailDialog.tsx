'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
  const [isMobile, setIsMobile] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

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

  // Handle body scroll locking when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      if (backUrl) {
        router.push(backUrl);
      }
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <div className={`detail-dialog ${isClosing ? 'closing' : ''}`}>
      <div className="dialog-overlay" onClick={handleClose}></div>
      
      <div className={`dialog-container ${isMobile ? 'mobile' : 'desktop'}`}>
        <div className="dialog-header">
          <div className="header-content">
            <h2 className="dialog-title">{title}</h2>
            <span className="system-id">{systemId}</span>
          </div>
          <button 
            className="close-button"
            onClick={handleClose}
            aria-label="Close details"
          >
            <span className="close-icon">×</span>
          </button>
        </div>
        
        <div className="dialog-content">
          {children}
        </div>
        
        <div className="dialog-footer">
          <button 
            className="back-button"
            onClick={handleClose}
          >
            BACK TO LIST
          </button>
        </div>
      </div>

      <style jsx>{`
        .detail-dialog {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.3s ease;
        }

        .detail-dialog.closing {
          animation: fadeOut 0.3s ease;
        }

        .dialog-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 20, 40, 0.8);
          backdrop-filter: blur(4px);
        }

        .dialog-container {
          position: relative;
          background: var(--panel-bg);
          border: 1px solid var(--nyc-orange);
          box-shadow: var(--border-glow);
          display: flex;
          flex-direction: column;
          max-height: 90vh;
          width: 90%;
          max-width: 1200px;
          animation: slideIn 0.3s ease;
          z-index: 1;
        }

        .dialog-container.closing {
          animation: slideOut 0.3s ease;
        }

        .dialog-container.mobile {
          width: 100%;
          height: 100%;
          max-height: 100vh;
          max-width: 100%;
          border: none;
          border-top: 1px solid var(--nyc-orange);
        }

        .dialog-header {
          background: linear-gradient(90deg, var(--nyc-blue), var(--background));
          padding: 1rem;
          border-bottom: 1px solid var(--nyc-orange);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .dialog-title {
          color: var(--nyc-orange);
          font-family: var(--font-display);
          font-size: 1.2rem;
          margin: 0;
        }

        .system-id {
          color: var(--terminal-color);
          font-family: var(--font-mono);
          font-size: 0.8rem;
          opacity: 0.8;
        }

        .close-button {
          background: none;
          border: none;
          color: var(--nyc-orange);
          font-size: 1.5rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
        }

        .dialog-content {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
          scrollbar-width: thin;
          scrollbar-color: var(--nyc-orange) var(--panel-bg);
        }

        .dialog-content::-webkit-scrollbar {
          width: 6px;
        }

        .dialog-content::-webkit-scrollbar-track {
          background: var(--panel-bg);
        }

        .dialog-content::-webkit-scrollbar-thumb {
          background: var(--nyc-orange);
          border-radius: 3px;
        }

        .dialog-footer {
          padding: 1rem;
          border-top: 1px solid rgba(0, 56, 117, 0.5);
          display: flex;
          justify-content: flex-end;
        }

        .back-button {
          background: rgba(0, 56, 117, 0.3);
          border: 1px solid var(--terminal-color);
          color: var(--terminal-color);
          padding: 0.5rem 1rem;
          font-family: var(--font-mono);
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .back-button:hover {
          background: rgba(0, 56, 117, 0.5);
          border-color: var(--nyc-orange);
          color: var(--nyc-orange);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        @keyframes slideIn {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        @keyframes slideOut {
          from { transform: translateY(0); opacity: 1; }
          to { transform: translateY(20px); opacity: 0; }
        }

        @media (max-width: 768px) {
          .dialog-header {
            padding: 0.75rem;
          }

          .dialog-title {
            font-size: 1.1rem;
          }

          .dialog-content {
            padding: 1rem;
          }
        }

        @media (max-width: 480px) {
          .dialog-header {
            padding: 0.5rem 0.75rem;
          }

          .dialog-title {
            font-size: 1rem;
          }

          .dialog-content {
            padding: 0.75rem;
          }

          .dialog-footer {
            padding: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
} 