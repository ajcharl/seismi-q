import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveFeed } from '../hooks/useEarthquakes';
import { useIsMobile } from '../hooks/useIsMobile';
import StatsBar from '../components/StatsBar';
import QuakeList from '../components/QuakeList';
import QuakeMap from '../components/QuakeMap';
import QuakeGlobe from '../components/QuakeGlobe';

const feeds = [
  { key: 'all_hour', label: 'Past Hour' },
  { key: 'all_day', label: 'Past 24h' },
  { key: 'all_week', label: 'Past 7 Days' },
  { key: 'm45_day', label: 'M4.5+ Today' },
  { key: 'significant_month', label: 'Significant (Month)' },
];

const tabStyle = (active) => ({
  padding: '6px 14px',
  fontSize: '0.7rem',
  fontFamily: 'var(--font-mono)',
  border: `1px solid ${active ? 'var(--border-active)' : 'var(--border)'}`,
  borderRadius: '8px',
  background: active ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
  color: active ? 'var(--text-primary)' : 'var(--text-muted)',
  cursor: 'pointer',
  fontWeight: active ? 500 : 400,
});

export default function Dashboard() {
  const [activeFeed, setActiveFeed] = useState('all_day');
  const { data, loading, error, refresh } = useLiveFeed(activeFeed);
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const handleQuakeClick = useCallback((quake) => {
    navigate(`/quake/${quake.id}`);
  }, [navigate]);

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>
            Live Seismic Activity
          </h1>
          <p style={{
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            marginTop: '4px',
          }}>
            Data from USGS Earthquake Hazards Program · Auto-refreshes every 60s
          </p>
        </div>
        <button onClick={refresh} style={{
          padding: '7px 16px',
          fontSize: '0.7rem',
          fontFamily: 'var(--font-mono)',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          color: 'var(--text-secondary)',
        }}>
          Refresh
        </button>
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {feeds.map(f => (
          <button key={f.key} style={tabStyle(activeFeed === f.key)} onClick={() => setActiveFeed(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      {loading && !data && (
        <div style={{
          padding: '60px 20px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8rem',
        }}>
          <div style={{
            width: '28px', height: '28px',
            border: '2px solid var(--border)',
            borderTopColor: 'var(--text-muted)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 14px',
          }} />
          Loading seismic data...
        </div>
      )}
      {error && <p style={{ color: 'var(--seismic-red)', padding: '20px' }}>Error: {error}</p>}

      {data && (
        <>
          <StatsBar stats={data.stats} />

          {isMobile ? (
            <div style={{
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              border: '1px solid var(--border)',
              marginBottom: '24px',
            }}>
              <QuakeMap quakes={data.quakes} height="420px" onQuakeClick={handleQuakeClick} />
            </div>
          ) : (
            <div style={{ marginBottom: '24px' }}>
              <QuakeGlobe quakes={data.quakes} height="520px" onQuakeClick={handleQuakeClick} />
            </div>
          )}

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            margin: '0 0 12px',
          }}>
            <h2 style={{
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontWeight: 600,
            }}>
              Recent Events
            </h2>
            <span style={{
              fontSize: '0.62rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
              padding: '1px 6px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border)',
            }}>
              {data.quakes.length}
            </span>
          </div>
          <QuakeList quakes={data.quakes} limit={50} />
        </>
      )}
    </div>
  );
}
