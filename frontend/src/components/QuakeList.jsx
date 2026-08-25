import React from 'react';
import { Link } from 'react-router-dom';
import SeverityBadge from './SeverityBadge';

function timeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function MagBadge({ magnitude, color }) {
  return (
    <div style={{
      width: '44px',
      height: '44px',
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-mono)',
      fontWeight: 800,
      fontSize: '0.88rem',
      color: '#fff',
      background: color,
      flexShrink: 0,
    }}>
      {magnitude.toFixed(1)}
    </div>
  );
}

export default function QuakeList({ quakes, limit = 30 }) {
  if (!quakes?.length) return <p style={{ color: 'var(--text-secondary)', padding: '20px' }}>No earthquakes found.</p>;

  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border)',
      overflow: 'hidden',
      animation: 'fadeInUp 0.4s ease',
    }}>
      {quakes.slice(0, limit).map((q, i) => (
        <Link to={`/quake/${q.id}`} key={q.id} style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '12px 16px',
            borderBottom: i < Math.min(quakes.length, limit) - 1 ? '1px solid var(--border)' : 'none',
            transition: 'background 0.15s ease',
          }} className="quake-row">
            <MagBadge magnitude={q.magnitude} color={q.severity.color} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '0.85rem',
                fontWeight: 500,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {q.place || 'Unknown location'}
              </div>
              <div style={{
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                marginTop: '3px',
                display: 'flex',
                gap: '6px',
                alignItems: 'center',
              }}>
                <span>{q.coordinates.depth.toFixed(1)} km deep</span>
                {q.felt ? (
                  <span style={{
                    padding: '1px 6px',
                    borderRadius: '6px',
                    fontSize: '0.58rem',
                    background: 'rgba(139, 92, 246, 0.1)',
                    color: 'var(--seismic-purple)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                  }}>
                    Felt by {q.felt}
                  </span>
                ) : null}
                {q.tsunami ? (
                  <span style={{
                    padding: '1px 6px',
                    borderRadius: '6px',
                    fontSize: '0.58rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: 'var(--seismic-red)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    fontWeight: 600,
                  }}>
                    TSUNAMI
                  </span>
                ) : null}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <SeverityBadge severity={q.severity} />
              <div style={{
                fontSize: '0.62rem',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                marginTop: '4px',
              }}>
                {timeAgo(q.time)}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
