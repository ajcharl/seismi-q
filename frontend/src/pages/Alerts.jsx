import React from 'react';
import AlertZoneManager from '../components/AlertZoneManager';

export default function Alerts({ zones, onAdd, onRemove, onToggle }) {
  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Earthquake Alerts</h1>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          Define geographic zones and receive browser notifications when earthquakes occur within them
        </p>
      </div>

      <AlertZoneManager
        zones={zones}
        onAdd={onAdd}
        onRemove={onRemove}
        onToggle={onToggle}
      />
    </div>
  );
}
