'use client';
import React, { useCallback, useEffect, useState } from 'react';

interface Channel {
  id: string;
  callsign: string;
  name: string;
  freq: string;
  href: string;
  band: string;
}

const CHANNELS: Channel[] = [
  { id: 'nyt', callsign: 'W.NYT', name: 'NEW YORK TIMES', freq: '101.7', href: 'https://www.nytimes.com', band: 'PRINT' },
  { id: 'gothamist', callsign: 'W.GTH', name: 'GOTHAMIST', freq: '98.3', href: 'https://gothamist.com', band: 'LOCAL' },
  { id: 'city', callsign: 'W.CTY', name: 'THE CITY', freq: '91.5', href: 'https://www.thecity.nyc', band: 'CIVIC' },
  { id: 'hellgate', callsign: 'W.HEL', name: 'HELL GATE', freq: '88.1', href: 'https://hellgatenyc.com', band: 'INDIE' },
  { id: 'curbed', callsign: 'W.CRB', name: 'CURBED NY', freq: '104.3', href: 'https://ny.curbed.com', band: 'URBAN' },
  { id: 'ny1', callsign: 'W.NY1', name: 'SPECTRUM NY1', freq: '96.9', href: 'https://www.ny1.com', band: 'CABLE' },
  { id: 'voice', callsign: 'W.VV', name: 'VILLAGE VOICE', freq: '89.9', href: 'https://www.villagevoice.com', band: 'ALT' },
];

const TICKER = [
  'PRETZEL CARTS: OPERATIONAL',
  'RATS: NOMINAL BELOW 14TH',
  'YELLOW CABS: STILL IN THE WILD',
  'PIZZA: FOLDED, AS INTENDED',
  'L TRAIN: EXISTENTIAL',
  'TIMES SQUARE: DO NOT MAKE EYE CONTACT',
  'HIGH LINE: BIRDS HAVE THE CON',
  'STATEN ISLAND FERRY: ROMANTIC',
  'BROOKLYN: STILL THERE',
  'QUEENS: HAS THE GOOD FOOD',
  'BRONX: ZOO ANIMALS UNBOTHERED',
];

const SPECTRUM_BARS = 18;

function formatNycTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function CityUplink() {
  const [tunedIndex, setTunedIndex] = useState(0);
  const [locked, setLocked] = useState(false);
  const [tickerIndex, setTickerIndex] = useState(0);
  const [nycTime, setNycTime] = useState(() => formatNycTime(new Date()));

  const tuned = CHANNELS[tunedIndex];

  useEffect(() => {
    const clock = window.setInterval(() => {
      setNycTime(formatNycTime(new Date()));
    }, 1000);
    return () => window.clearInterval(clock);
  }, []);

  useEffect(() => {
    if (locked) return;
    const scan = window.setInterval(() => {
      setTunedIndex(prev => (prev + 1) % CHANNELS.length);
    }, 2200);
    return () => window.clearInterval(scan);
  }, [locked]);

  useEffect(() => {
    const crawl = window.setInterval(() => {
      setTickerIndex(prev => (prev + 1) % TICKER.length);
    }, 3800);
    return () => window.clearInterval(crawl);
  }, []);

  const playClick = useCallback(() => {
    const audio = new Audio('/sounds/button-click.mp3');
    audio.volume = 0.18;
    audio.play().catch(() => {});
  }, []);

  const handleTune = (index: number) => {
    setTunedIndex(index);
    setLocked(true);
    playClick();
  };

  return (
    <div className="city-uplink">
      <div className="receiver">
        <div className="receiver-meta">
          <span className={`scan-lamp ${locked ? 'locked' : 'scanning'}`} />
          <span className="scan-state">{locked ? 'LOCKED' : 'SCANNING'}</span>
          <span className="local-time">{nycTime} EST</span>
        </div>
        <div className="tuned-row">
          <div className="tuned-name">{tuned.name}</div>
          <div className="tuned-freq">{tuned.freq}</div>
        </div>
        <div className="tuned-sub">
          <span>{tuned.callsign}</span>
          <span>//</span>
          <span>{tuned.band}.BAND</span>
        </div>
        <div className="spectrum" aria-hidden="true">
          {Array.from({ length: SPECTRUM_BARS }, (_, i) => (
            <span
              key={i}
              className="spectrum-bar"
              style={{ animationDelay: `${i * 0.08}s` }}
            />
          ))}
        </div>
      </div>

      <div className="channel-list">
        {CHANNELS.map((channel, index) => (
          <a
            key={channel.id}
            href={channel.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`channel ${index === tunedIndex ? 'active' : ''}`}
            onMouseEnter={() => handleTune(index)}
            onFocus={() => handleTune(index)}
            onClick={playClick}
          >
            <span className="channel-mark" />
            <span className="channel-call">{channel.callsign}</span>
            <span className="channel-name">{channel.name}</span>
            <span className="channel-freq">{channel.freq}</span>
          </a>
        ))}
      </div>

      <div className="ticker">
        <span className="ticker-tag">NY.GRID</span>
        <span className="ticker-text">{TICKER[tickerIndex]}</span>
      </div>

      <style jsx>{`
        .city-uplink {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          height: 100%;
          min-height: 0;
          font-family: var(--font-mono);
        }

        .receiver {
          flex-shrink: 0;
          padding: 0.55rem 0.6rem 0.45rem;
          background: rgba(0, 20, 40, 0.55);
          border: 1px solid var(--nyc-orange);
        }

        .receiver-meta {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.65rem;
          letter-spacing: 0.12em;
          color: var(--terminal-color);
          margin-bottom: 0.35rem;
        }

        .scan-lamp {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--nyc-orange);
          box-shadow: 0 0 8px var(--nyc-orange);
        }

        .scan-lamp.scanning {
          animation: lamp 0.9s steps(2) infinite;
        }

        .scan-lamp.locked {
          animation: none;
          opacity: 1;
        }

        .scan-state {
          flex: 1;
        }

        .local-time {
          letter-spacing: 0.08em;
          opacity: 0.85;
        }

        .tuned-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 0.5rem;
        }

        .tuned-name {
          color: var(--nyc-white);
          font-size: 0.78rem;
          letter-spacing: 0.08em;
          font-weight: 700;
        }

        .tuned-freq {
          color: var(--nyc-orange);
          font-size: 1.05rem;
          font-weight: 700;
          letter-spacing: 0.06em;
        }

        .tuned-sub {
          display: flex;
          gap: 0.35rem;
          margin-top: 0.15rem;
          color: var(--terminal-color);
          font-size: 0.62rem;
          letter-spacing: 0.14em;
          opacity: 0.8;
        }

        .spectrum {
          display: flex;
          align-items: flex-end;
          gap: 3px;
          height: 28px;
          margin-top: 0.45rem;
        }

        .spectrum-bar {
          flex: 1;
          height: 40%;
          background: var(--nyc-orange);
          opacity: 0.75;
          animation: spectrum 1.4s ease-in-out infinite;
          transform-origin: bottom;
        }

        .channel-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
          min-height: 0;
          overflow-y: auto;
        }

        .channel {
          display: grid;
          grid-template-columns: 8px 3.4rem 1fr auto;
          align-items: center;
          gap: 0.4rem;
          padding: 0.28rem 0.4rem;
          text-decoration: none;
          color: var(--terminal-color);
          border: 1px solid transparent;
          background: rgba(0, 20, 40, 0.35);
          font-size: 0.68rem;
          letter-spacing: 0.06em;
        }

        .channel:hover,
        .channel.active {
          border-color: var(--nyc-orange);
          background: rgba(0, 56, 117, 0.55);
          color: var(--nyc-orange);
        }

        .channel-mark {
          width: 6px;
          height: 6px;
          background: var(--nyc-orange);
          opacity: 0.35;
        }

        .channel.active .channel-mark,
        .channel:hover .channel-mark {
          opacity: 1;
          box-shadow: 0 0 6px var(--nyc-orange);
        }

        .channel-call {
          opacity: 0.7;
        }

        .channel-name {
          color: var(--nyc-white);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .channel.active .channel-name,
        .channel:hover .channel-name {
          color: var(--nyc-orange);
        }

        .channel-freq {
          opacity: 0.7;
        }

        .ticker {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.28rem 0.4rem;
          border: 1px solid rgba(255, 107, 28, 0.45);
          background: rgba(0, 20, 40, 0.7);
          font-size: 0.62rem;
          letter-spacing: 0.1em;
          color: var(--nyc-white);
          flex-shrink: 0;
        }

        .ticker-tag {
          color: var(--nyc-orange);
          white-space: nowrap;
        }

        .ticker-text {
          opacity: 0.9;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        @keyframes lamp {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0.25; }
        }

        @keyframes spectrum {
          0%, 100% { height: 28%; }
          50% { height: 100%; }
        }
      `}</style>
    </div>
  );
}
