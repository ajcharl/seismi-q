import React, { useEffect, useState } from 'react';

function Toast({ quake, onDismiss }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(quake.id), 300);
    }, 8000);
    return () => clearTimeout(timer);
  }, [quake.id, onDismiss]);

  const color = quake.severity?.color || 'var(--seismic-cyan)';

  return (
    <div
      onClick={() => { setVisible(false); setTimeout(() => onDismiss(quake.id), 300); }}
      style={{
        padding: '12px 16px',
        background: 'var(--bg-elevated)',
        border: `1px solid var(--border)`,
        borderLeft: `3px solid ${color}`,
        borderRadius: '10px',
        cursor: 'pointer',
        transform: visible ? 'translateX(0)' : 'translateX(110%)',
        opacity: visible ? 1 : 0,
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        maxWidth: '340px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
        <div style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: color,
        }} />
        <span style={{
          fontSize: '0.58rem', fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}>
          New Earthquake
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span style={{
          fontSize: '1.3rem', fontWeight: 800, fontFamily: 'var(--font-mono)',
          color,
        }}>
          M{quake.magnitude.toFixed(1)}
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          {quake.place || 'Unknown location'}
        </span>
      </div>
      <div style={{
        fontSize: '0.58rem', color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)', marginTop: '4px',
      }}>
        {new Date(quake.time).toLocaleTimeString()} · Depth: {quake.coordinates?.depth?.toFixed(0) || '?'} km
      </div>
    </div>
  );
}

export default function ToastNotifications({ quakes, onDismiss }) {
  if (!quakes || quakes.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '68px',
      right: '16px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      pointerEvents: 'none',
    }}>
      {quakes.slice(0, 5).map(q => (
        <div key={q.id} style={{ pointerEvents: 'auto' }}>
          <Toast quake={q} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}
