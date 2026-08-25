import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuakeDetail } from '../hooks/useEarthquakes';
import SeverityBadge from '../components/SeverityBadge';
import AftershockForecast from '../components/AftershockForecast';
import Seismogram from '../components/Seismogram';
import QuakeMap from '../components/QuakeMap';

const infoRow = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '10px 0',
  borderBottom: '1px solid var(--border)',
};

const infoLabel = {
  fontSize: '0.7rem',
  fontFamily: 'var(--font-mono)',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

const infoValue = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.8rem',
  fontWeight: 500,
};

export default function QuakeDetail() {
  const { id } = useParams();
  const { data, loading, error } = useQuakeDetail(id);

  if (loading) return (
    <div style={{ padding: '60px 20px', textAlign: 'center' }}>
      <div style={{
        width: '28px', height: '28px',
        border: '2px solid var(--border)',
        borderTopColor: 'var(--text-muted)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        margin: '0 auto 14px',
      }} />
      <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
        Loading event data...
      </p>
    </div>
  );
  if (error) return <p style={{ color: 'var(--seismic-red)', padding: '40px' }}>Error: {error}</p>;
  if (!data) return null;

  return (
    <div style={{ animation: 'fadeInUp 0.3s ease' }}>
      <Link to="/" style={{
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        marginBottom: '20px',
        padding: '5px 12px',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        background: 'var(--bg-card)',
      }}>
        ← Back to live feed
      </Link>

      {/* Hero */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        marginBottom: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '2.6rem',
            fontWeight: 900,
            fontFamily: 'var(--font-mono)',
            color: data.severity.color,
            lineHeight: 1,
          }}>
            M{data.magnitude.toFixed(1)}
          </span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <SeverityBadge severity={data.severity} />
            {data.tsunami && (
              <span style={{
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '0.62rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                background: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--seismic-red)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
              }}>
                TSUNAMI
              </span>
            )}
          </div>
        </div>

        <h1 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '4px' }}>
          {data.place || 'Unknown location'}
        </h1>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {new Date(data.time).toLocaleString()} · {data.status}
        </p>
      </div>

      {/* Map */}
      <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)', marginBottom: '16px' }}>
        <QuakeMap quakes={[data]} height="280px" />
      </div>

      {/* Details */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px 20px',
      }}>
        <div style={infoRow}>
          <span style={infoLabel}>Coordinates</span>
          <span style={infoValue}>{data.coordinates.lat.toFixed(4)}, {data.coordinates.lng.toFixed(4)}</span>
        </div>
        <div style={infoRow}>
          <span style={infoLabel}>Depth</span>
          <span style={infoValue}>{data.coordinates.depth.toFixed(1)} km</span>
        </div>
        <div style={infoRow}>
          <span style={infoLabel}>Magnitude Type</span>
          <span style={infoValue}>{data.magType}</span>
        </div>
        <div style={infoRow}>
          <span style={infoLabel}>Significance</span>
          <span style={infoValue}>{data.significance}</span>
        </div>
        {data.felt && (
          <div style={infoRow}>
            <span style={infoLabel}>Felt Reports</span>
            <span style={{ ...infoValue, color: 'var(--seismic-purple)' }}>{data.felt} people</span>
          </div>
        )}
        {data.mmi && (
          <div style={infoRow}>
            <span style={infoLabel}>Shaking Intensity (MMI)</span>
            <span style={infoValue}>{data.mmi}</span>
          </div>
        )}
        <div style={{ ...infoRow, borderBottom: 'none' }}>
          <span style={infoLabel}>USGS Alert</span>
          <span style={{
            ...infoValue,
            color: data.alert === 'red' ? 'var(--seismic-red)' :
              data.alert === 'orange' ? 'var(--seismic-orange)' :
              data.alert === 'yellow' ? 'var(--seismic-yellow)' :
              data.alert === 'green' ? 'var(--seismic-green)' : 'var(--text-muted)',
          }}>
            {data.alert || 'None'}
          </span>
        </div>
      </div>

      <Seismogram magnitude={data.magnitude} depthKm={data.coordinates.depth} />
      {data.magnitude >= 4 && <AftershockForecast quakeId={id} />}

      <a
        href={data.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          marginTop: '16px',
          padding: '7px 14px',
          fontSize: '0.75rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--seismic-cyan)',
          background: 'rgba(6, 182, 212, 0.06)',
          border: '1px solid rgba(6, 182, 212, 0.15)',
          borderRadius: '8px',
        }}
      >
        View on USGS →
      </a>
    </div>
  );
}
