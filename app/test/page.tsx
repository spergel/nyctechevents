'use client';
import React from 'react';
import { Panel } from '../components/ui/Panel';
import { SectionTitle } from '../components/ui/SectionTitle';
import { ConsoleModule } from '../components/ui/ConsoleModule';
import { CyberButton } from '../components/ui/CyberButton';
import { DataGrid } from '../components/ui/DataGrid';
import { DataStream } from '../components/ui/DataStream';
import { HolographicDisplay } from '../components/ui/HolographicDisplay';
import { TerminalDisplay } from '../components/ui/TerminalDisplay';
import { RadarScan } from '../components/ui/RadarScan';
import { NavigationArray } from '../components/ui/NavigationArray';
import { SystemStatusPanel } from '../components/ui/SystemStatusPanel';

export default function TestPage() {
  const navItems = [
    { label: 'DASHBOARD', link: '#' },
    { label: 'ANALYZE', link: '#' },
    { label: 'DEPLOY', link: '#' },
    { label: 'ARCHIVE', link: '#' },
  ];

  const statusData = [
    { label: 'SYSTEM POWER', value: 92, color: 'var(--nyc-orange)' },
    { label: 'NETWORK UPLINK', value: 87, color: 'var(--terminal-color)' },
    { label: 'DATA INTEGRITY', value: 95, color: '#00ff88' },
    { label: 'MEMORY USAGE', value: 45, color: '#ff3366' },
  ];

  const gridData = [
    { label: 'SECTOR A', value: 75 },
    { label: 'SECTOR B', value: 42 },
    { label: 'SECTOR C', value: 98 },
    { label: 'SECTOR D', value: 63 },
  ];

  const radarData = [
    { x: 20, y: 30 },
    { x: 85, y: 60 },
    { x: 50, y: 50 },
    { x: 70, y: 20 },
    { x: 15, y: 75 },
  ];

  return (
    <main className="test-container">
      <SectionTitle 
        title="SYSTEM COMPONENTS TEST" 
        subtitle="DIAGNOSTIC MODE ACTIVE"
      />
      
      <div className="components-grid">
        {/* Left Column */}
        <div className="column">
          <Panel title="NAVIGATION SYSTEMS" systemId="NAV-001">
            <NavigationArray items={navItems} />
          </Panel>

          <Panel title="SYSTEM STATUS" systemId="SYS-002">
            <SystemStatusPanel statuses={statusData} />
          </Panel>

          <Panel title="TERMINAL ACCESS" systemId="TERM-003">
            <TerminalDisplay text="INITIALIZING DIAGNOSTIC SEQUENCE...\nALL SYSTEMS NOMINAL\nAWAITING FURTHER INSTRUCTIONS..." />
          </Panel>
        </div>

        {/* Center Column */}
        <div className="column">
          <Panel title="HOLOGRAPHIC PROJECTION" systemId="HOLO-001" variant="monitor">
            <HolographicDisplay>
              <h2>NYC GRID</h2>
              <p>SYSTEM ACTIVE</p>
            </HolographicDisplay>
          </Panel>

          <Panel title="DATA STREAMS" systemId="DATA-002">
            <DataStream lines={8} />
          </Panel>

          <ConsoleModule title="QUICK ACTIONS" variant="secondary">
            <div className="button-grid">
              <CyberButton label="INITIALIZE" onClick={() => alert('System Initialized')} />
              <CyberButton label="SCAN" onClick={() => alert('Scan Complete')} variant="secondary" />
              <CyberButton label="DEPLOY" onClick={() => alert('Deployment Started')} />
              <CyberButton label="RESET" onClick={() => alert('System Reset')} variant="secondary" />
            </div>
          </ConsoleModule>
        </div>

        {/* Right Column */}
        <div className="column">
          <Panel title="RADAR SYSTEMS" systemId="RAD-001">
            <div className="radar-container">
              <RadarScan dataPoints={radarData} />
            </div>
          </Panel>

          <Panel title="GRID STATUS" systemId="GRID-002">
            <DataGrid data={gridData} />
          </Panel>

          <ConsoleModule title="SYSTEM METRICS" variant="secondary">
            <div className="metrics-grid">
              <div className="metric">
                <div className="metric-label">UPTIME</div>
                <div className="metric-value">99.9%</div>
              </div>
              <div className="metric">
                <div className="metric-label">LATENCY</div>
                <div className="metric-value">12ms</div>
              </div>
              <div className="metric">
                <div className="metric-label">LOAD</div>
                <div className="metric-value">42%</div>
              </div>
            </div>
          </ConsoleModule>
        </div>
      </div>

      <style jsx>{`
        .test-container {
          padding: 2rem;
          min-height: 100vh;
          background: var(--background);
        }

        .components-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
          margin-top: 2rem;
        }

        .column {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .button-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          padding: 1rem;
        }

        .radar-container {
          display: flex;
          justify-content: center;
          padding: 2rem;
          background: rgba(0, 20, 40, 0.3);
          border-radius: 8px;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          padding: 1rem;
        }

        .metric {
          text-align: center;
          padding: 1rem;
          background: rgba(0, 20, 40, 0.3);
          border: 1px solid var(--nyc-orange);
        }

        .metric-label {
          font-size: 0.8rem;
          color: var(--nyc-orange);
          margin-bottom: 0.5rem;
          font-family: var(--font-mono);
        }

        .metric-value {
          font-size: 1.2rem;
          color: var(--terminal-color);
          font-family: 'Eurostile', sans-serif;
        }

        @media (max-width: 1200px) {
          .components-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
