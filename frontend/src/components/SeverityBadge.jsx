import React from 'react';

export default function SeverityBadge({ severity }) {
  if (!severity) return null;
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 8px',
      borderRadius: '6px',
      fontSize: '0.62rem',
      fontFamily: 'var(--font-mono)',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      color: severity.color,
      background: `${severity.color}14`,
      border: `1px solid ${severity.color}28`,
    }}>
      {severity.label}
    </span>
  );
}
