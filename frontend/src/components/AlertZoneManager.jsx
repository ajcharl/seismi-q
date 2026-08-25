import React, { useState, useRef, useEffect, useCallback } from 'react';
import { requestNotificationPermission } from '../hooks/useAlertZones';

const cardStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  padding: '16px',
};

const inputStyle = {
  width: '100%',
  padding: '6px 10px',
  fontSize: '0.75rem',
  fontFamily: 'var(--font-mono)',
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: '4px',
  color: 'var(--text-primary)',
  outline: 'none',
};

const btnStyle = (variant = 'default') => ({
  padding: '6px 14px',
  fontSize: '0.7rem',
  fontFamily: 'var(--font-mono)',
  border: `1px solid ${variant === 'danger' ? 'var(--seismic-red)' : variant === 'primary' ? 'var(--seismic-cyan)' : 'var(--border)'}`,
  borderRadius: '4px',
  background: variant === 'primary' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
  color: variant === 'danger' ? 'var(--seismic-red)' : variant === 'primary' ? 'var(--seismic-cyan)' : 'var(--text-secondary)',
  cursor: 'pointer',
  transition: 'all 0.15s',
});

// Interactive map for picking alert zone center and radius
function ZonePicker({ onConfirm, onCancel }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const [center, setCenter] = useState(null);
  const [radius, setRadius] = useState(200);
  const [minMag, setMinMag] = useState(4);
  const [name, setName] = useState('');

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const L = window.L;
    if (!L) return;

    const map = L.map(mapRef.current, {
      center: [20, 0],
      zoom: 2,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
    }).addTo(map);

    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      setCenter({ lat: parseFloat(lat.toFixed(4)), lng: parseFloat(lng.toFixed(4)) });

      if (markerRef.current) {
        markerRef.current.setLatLng(e.latlng);
        circleRef.current.setLatLng(e.latlng);
      } else {
        markerRef.current = L.circleMarker(e.latlng, {
          radius: 6,
          fillColor: '#06b6d4',
          fillOpacity: 1,
          color: '#06b6d4',
          weight: 2,
        }).addTo(map);

        circleRef.current = L.circle(e.latlng, {
          radius: radius * 1000,
          color: 'rgba(6, 182, 212, 0.5)',
          fillColor: 'rgba(6, 182, 212, 0.08)',
          fillOpacity: 0.3,
          weight: 1.5,
          dashArray: '6, 4',
        }).addTo(map);
      }
    });

    mapInstanceRef.current = map;
    return () => { map.remove(); mapInstanceRef.current = null; };
  }, []);

  // Update circle radius when slider changes
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(radius * 1000);
    }
  }, [radius]);

  const handleConfirm = () => {
    if (!center) return;
    onConfirm({ lat: center.lat, lng: center.lng, radiusKm: radius, minMagnitude: minMag, name: name || undefined });
  };

  return (
    <div style={cardStyle}>
      <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>Create Alert Zone</h4>
      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '12px' }}>
        Click the map to set the center of your alert zone
      </p>

      <div
        ref={mapRef}
        style={{
          width: '100%',
          height: '280px',
          borderRadius: '4px',
          border: '1px solid var(--border)',
          background: '#0a0f1a',
          marginBottom: '12px',
        }}
      />

      {center && (
        <p style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--seismic-cyan)', marginBottom: '12px' }}>
          Center: {center.lat}, {center.lng}
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
            Zone Name
          </label>
          <input
            style={inputStyle}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Home, Office"
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
            Min Magnitude
          </label>
          <select
            style={{ ...inputStyle, cursor: 'pointer' }}
            value={minMag}
            onChange={e => setMinMag(Number(e.target.value))}
          >
            {[3, 4, 5, 6, 7].map(m => (
              <option key={m} value={m}>M{m}+</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: '14px' }}>
        <label style={{ display: 'block', fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
          Radius: {radius} km
        </label>
        <input
          type="range"
          min="50"
          max="1000"
          step="50"
          value={radius}
          onChange={e => setRadius(Number(e.target.value))}
          style={{ width: '100%', accentColor: 'var(--seismic-cyan)' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          <span>50km</span>
          <span>1000km</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button style={btnStyle()} onClick={onCancel}>Cancel</button>
        <button
          style={btnStyle(center ? 'primary' : 'default')}
          onClick={handleConfirm}
          disabled={!center}
        >
          Create Zone
        </button>
      </div>
    </div>
  );
}

export default function AlertZoneManager({ zones, onAdd, onRemove, onToggle }) {
  const [creating, setCreating] = useState(false);
  const [permissionState, setPermissionState] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

  const handleRequestPermission = async () => {
    const result = await requestNotificationPermission();
    setPermissionState(result);
  };

  const handleCreate = (zoneData) => {
    onAdd(zoneData);
    setCreating(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '2px' }}>Alert Zones</h2>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Get notified when earthquakes occur near your locations
          </p>
        </div>
        {!creating && (
          <button style={btnStyle('primary')} onClick={() => setCreating(true)}>
            + Add Zone
          </button>
        )}
      </div>

      {/* Notification permission banner */}
      {permissionState !== 'granted' && permissionState !== 'unsupported' && (
        <div style={{
          ...cardStyle,
          marginBottom: '12px',
          borderColor: 'var(--seismic-orange)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '2px' }}>
              Enable Browser Notifications
            </p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {permissionState === 'denied'
                ? 'Notifications are blocked. Enable them in your browser settings.'
                : 'Allow notifications to receive earthquake alerts for your zones.'}
            </p>
          </div>
          {permissionState !== 'denied' && (
            <button style={btnStyle('primary')} onClick={handleRequestPermission}>
              Enable
            </button>
          )}
        </div>
      )}

      {/* Zone picker */}
      {creating && (
        <div style={{ marginBottom: '16px' }}>
          <ZonePicker onConfirm={handleCreate} onCancel={() => setCreating(false)} />
        </div>
      )}

      {/* Zone list */}
      {zones.length === 0 && !creating ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '30px 20px' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>No alert zones configured</p>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Create a zone to receive notifications for earthquakes near you
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {zones.map(zone => (
            <div key={zone.id} style={{
              ...cardStyle,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              opacity: zone.enabled ? 1 : 0.5,
              transition: 'opacity 0.2s',
            }}>
              {/* Status indicator */}
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: zone.enabled ? 'var(--seismic-green)' : 'var(--text-muted)',
                flexShrink: 0,
              }} />

              {/* Zone info */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '2px' }}>
                  {zone.name}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {zone.lat.toFixed(2)}, {zone.lng.toFixed(2)} · {zone.radiusKm}km · M{zone.minMagnitude}+
                </div>
              </div>

              {/* Controls */}
              <button
                style={btnStyle()}
                onClick={() => onToggle(zone.id)}
              >
                {zone.enabled ? 'Disable' : 'Enable'}
              </button>
              <button
                style={btnStyle('danger')}
                onClick={() => onRemove(zone.id)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
