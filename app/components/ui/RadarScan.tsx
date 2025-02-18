'use client';
import React from 'react';

interface RadarScanProps {
  dataPoints: { x: number; y: number }[];
}

export function RadarScan({ dataPoints }: RadarScanProps) {
  return (
    <div className="radar-scan">
      <div className="radar-sweep" />
      {dataPoints.map((point, index) => (
        <div
          key={index}
          className="radar-point"
          style={{
            left: `${point.x}%`,
            top: `${point.y}%`,
          }}
        />
      ))}
      <style jsx>{`
        .radar-scan {
          position: relative;
          width: 200px;
          height: 200px;
          border-radius: 50%;
          background: radial-gradient(
            circle at 50% 50%,
            rgba(0, 56, 117, 0.8) 0%,
            rgba(0, 20, 40, 0.9) 100%
          );
          border: 2px solid var(--nyc-orange);
          overflow: hidden;
        }

        .radar-sweep {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            45deg,
            transparent 40%,
            rgba(0, 255, 255, 0.1) 50%,
            transparent 60%
          );
          animation: rotate 4s linear infinite;
        }

        .radar-point {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: #ff0000;
          box-shadow: 0 0 4px #ff0000;
        }

        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
} 