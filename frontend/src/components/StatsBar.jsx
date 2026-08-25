import React from 'react';

function StatCard({ label, value, subtitle, accentColor }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '16px 20px',
      flex: '1 1 160px',
      minWidth: '140px',
    }}>
      <div style={{
        fontSize: '0.6rem',
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom: '6px',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '1.8rem',
        fontWeight: 800,
        color: accentColor,
        fontFamily: 'var(--font-mono)',
        lineHeight: 1,
      }}>
        {value}
      </div>
      {subtitle && (
        <div style={{
          fontSize: '0.72rem',
          color: 'var(--text-secondary)',
          marginTop: '6px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

export default function StatsBar({ stats }) {
  if (!stats) return null;

  return (
    <div style={{
      display: 'flex',
      gap: '10px',
      flexWrap: 'wrap',
      marginBottom: '20px',
      animation: 'fadeInUp 0.3s ease',
    }}>
      <StatCard label="Total Events" value={stats.total} accentColor="var(--seismic-cyan)" />
      <StatCard label="Significant (M4.5+)" value={stats.significant} accentColor="var(--seismic-orange)" />
      <StatCard label="Tsunami Alerts" value={stats.tsunamiWarnings} accentColor="var(--seismic-red)" />
      {stats.strongest && (
        <StatCard
          label="Strongest"
          value={`M${stats.strongest.magnitude}`}
          subtitle={stats.strongest.place}
          accentColor="var(--seismic-yellow)"
        />
      )}
    </div>
  );
}
