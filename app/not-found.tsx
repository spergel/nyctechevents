'use client';

export default function NotFound() {
  return (
    <div className="not-found">
      <h1>404 - Page Not Found</h1>
      <p>The page you are looking for does not exist.</p>
      <style jsx>{`
        .not-found {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          text-align: center;
          color: var(--nyc-white);
        }

        h1 {
          font-family: var(--font-display);
          color: var(--nyc-orange);
          margin-bottom: 1rem;
        }

        p {
          font-family: var(--font-mono);
          color: var(--terminal-color);
        }
      `}</style>
    </div>
  );
} 