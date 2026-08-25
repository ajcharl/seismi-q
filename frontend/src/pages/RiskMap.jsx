import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useHistoricalData, useRegionStats } from '../hooks/useEarthquakes';
import SeverityBadge from '../components/SeverityBadge';

// Magnitude-to-color mapping for heatmap dots
function magToHeatColor(mag) {
  if (mag >= 7) return 'rgba(239, 68, 68, 0.8)';
  if (mag >= 6) return 'rgba(220, 38, 38, 0.7)';
  if (mag >= 5) return 'rgba(249, 115, 22, 0.6)';
  if (mag >= 4) return 'rgba(234, 179, 8, 0.5)';
  return 'rgba(34, 197, 94, 0.4)';
}

// Risk level based on event density
function riskLevel(count, years) {
  const rate = count / years;
  if (rate >= 10) return { label: 'Extreme', color: '#ef4444' };
  if (rate >= 5) return { label: 'Very High', color: '#dc2626' };
  if (rate >= 2) return { label: 'High', color: '#f97316' };
  if (rate >= 0.5) return { label: 'Moderate', color: '#eab308' };
  return { label: 'Low', color: '#22c55e' };
}

const filterBtn = (active) => ({
  padding: '5px 12px',
  fontSize: '0.7rem',
  fontFamily: 'var(--font-mono)',
  border: `1px solid ${active ? 'var(--seismic-cyan)' : 'var(--border)'}`,
  borderRadius: '4px',
  background: active ? 'rgba(6, 182, 212, 0.1)' : 'transparent',
  color: active ? 'var(--seismic-cyan)' : 'var(--text-secondary)',
  cursor: 'pointer',
  transition: 'all 0.15s',
});

const cardStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  padding: '14px 16px',
};

const statRow = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '8px 0',
  borderBottom: '1px solid var(--border)',
  fontSize: '0.8rem',
};

export default function RiskMap() {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const heatLayerRef = useRef(null);
  const markerRef = useRef(null);

  const [minMag, setMinMag] = useState(4);
  const [years, setYears] = useState(20);

  // Fetch global historical data
  const params = useMemo(() => ({
    minmagnitude: minMag,
    years,
  }), [minMag, years]);

  const { data, loading, error } = useHistoricalData(params);
  const { data: regionData, loading: regionLoading, fetchStats, clear: clearRegion } = useRegionStats();

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const L = window.L;
    if (!L) return;

    const map = L.map(mapRef.current, {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 10,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
    }).addTo(map);

    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      fetchStats(lat.toFixed(4), lng.toFixed(4), 300, years);

      if (markerRef.current) {
        markerRef.current.setLatLng(e.latlng);
      } else {
        markerRef.current = L.circle(e.latlng, {
          radius: 300000,
          color: 'var(--seismic-cyan)',
          fillColor: 'rgba(6, 182, 212, 0.1)',
          fillOpacity: 0.3,
          weight: 1,
          dashArray: '6, 4',
        }).addTo(map);
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Update region stats radius parameter when years changes
  useEffect(() => {
    if (regionData) {
      fetchStats(regionData.region.lat, regionData.region.lng, 300, years);
    }
  }, [years]);

  // Draw heatmap dots on the map
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = window.L;
    if (!map || !L || !data?.quakes) return;

    // Remove old heat layer
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
    }

    // Create a layer group with circle markers for each quake
    const markers = data.quakes.map(q => {
      const radius = Math.max(2, Math.pow(1.5, q.magnitude - 3) * 3);
      return L.circleMarker([q.coordinates.lat, q.coordinates.lng], {
        radius,
        fillColor: magToHeatColor(q.magnitude),
        fillOpacity: 0.6,
        color: 'transparent',
        weight: 0,
      }).bindTooltip(
        `M${q.magnitude.toFixed(1)} · ${new Date(q.time).getFullYear()} · ${q.place || 'Unknown'}`,
        { className: 'dark-tooltip' }
      );
    });

    heatLayerRef.current = L.layerGroup(markers).addTo(map);
  }, [data]);

  const quakeCount = data?.quakes?.length || 0;
  const magCounts = useMemo(() => {
    if (!data?.quakes) return {};
    const counts = { '4-5': 0, '5-6': 0, '6-7': 0, '7+': 0 };
    data.quakes.forEach(q => {
      if (q.magnitude >= 7) counts['7+']++;
      else if (q.magnitude >= 6) counts['6-7']++;
      else if (q.magnitude >= 5) counts['5-6']++;
      else counts['4-5']++;
    });
    return counts;
  }, [data]);

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Seismic Risk Map</h1>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          Historical M{minMag}+ earthquake density over {years} years · Click anywhere for region statistics
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Min Magnitude
          </span>
          {[3, 4, 5, 6].map(m => (
            <button key={m} style={filterBtn(minMag === m)} onClick={() => setMinMag(m)}>
              M{m}+
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Time Range
          </span>
          {[5, 10, 20].map(y => (
            <button key={y} style={filterBtn(years === y)} onClick={() => setYears(y)}>
              {y}yr
            </button>
          ))}
        </div>
        {loading && (
          <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--seismic-cyan)' }}>
            Loading...
          </span>
        )}
      </div>

      {error && (
        <p style={{ color: 'var(--seismic-red)', fontSize: '0.8rem', marginBottom: '12px' }}>Error: {error}</p>
      )}

      {/* Global summary stats */}
      {data && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <div style={{ ...cardStyle, flex: '1', minWidth: '120px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--seismic-cyan)' }}>
              {quakeCount.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
              Total Events
            </div>
          </div>
          {Object.entries(magCounts).map(([range, count]) => (
            <div key={range} style={{ ...cardStyle, flex: '1', minWidth: '100px', textAlign: 'center' }}>
              <div style={{
                fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-mono)',
                color: range === '7+' ? '#ef4444' : range === '6-7' ? '#f97316' : range === '5-6' ? '#eab308' : '#22c55e',
              }}>
                {count.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                M{range}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Map and stats panel layout */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        {/* Map */}
        <div style={{ flex: '1 1 600px', minWidth: '300px' }}>
          <div
            ref={mapRef}
            style={{
              width: '100%',
              height: '500px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: '#0a0f1a',
            }}
          />
          {/* Legend */}
          <div style={{
            display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap',
            fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)',
          }}>
            {[
              { label: 'M7+', color: 'rgba(239, 68, 68, 0.8)' },
              { label: 'M6-7', color: 'rgba(220, 38, 38, 0.7)' },
              { label: 'M5-6', color: 'rgba(249, 115, 22, 0.6)' },
              { label: 'M4-5', color: 'rgba(234, 179, 8, 0.5)' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }} />
                {item.label}
              </div>
            ))}
          </div>
        </div>

        {/* Region stats panel */}
        <div style={{ flex: '0 0 320px', minWidth: '280px' }}>
          {!regionData && !regionLoading && (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Click the map</div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Click any location to see seismic risk statistics for a 300km radius
              </p>
            </div>
          )}

          {regionLoading && (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '40px 20px' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--seismic-cyan)', fontFamily: 'var(--font-mono)' }}>
                Analyzing region...
              </p>
            </div>
          )}

          {regionData && !regionLoading && (
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Region Analysis</h3>
                <button onClick={clearRegion} style={{
                  fontSize: '0.65rem', fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer',
                }}>
                  Clear
                </button>
              </div>

              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '12px' }}>
                {regionData.region.lat.toFixed(2)}, {regionData.region.lng.toFixed(2)} · {regionData.region.radiusKm}km radius
              </p>

              {/* Risk level badge */}
              {(() => {
                const risk = riskLevel(regionData.totalEvents, regionData.yearsAnalyzed);
                return (
                  <div style={{
                    padding: '8px 12px', borderRadius: '4px', marginBottom: '14px',
                    background: `${risk.color}15`, border: `1px solid ${risk.color}40`,
                    display: 'flex', alignItems: 'center', gap: '8px',
                  }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: risk.color }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: risk.color }}>{risk.label} Risk</span>
                  </div>
                );
              })()}

              <div style={statRow}>
                <span style={{ color: 'var(--text-muted)' }}>Total Events</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{regionData.totalEvents}</span>
              </div>
              <div style={statRow}>
                <span style={{ color: 'var(--text-muted)' }}>Avg/Year</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{regionData.avgPerYear}</span>
              </div>
              <div style={statRow}>
                <span style={{ color: 'var(--text-muted)' }}>Years Analyzed</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{regionData.yearsAnalyzed}</span>
              </div>

              {/* Strongest event */}
              {regionData.strongest && (
                <div style={{ marginTop: '14px' }}>
                  <h4 style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Strongest Recorded
                  </h4>
                  <div style={{
                    padding: '10px', borderRadius: '4px',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{
                        fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)',
                        color: regionData.strongest.severity?.color || 'var(--seismic-red)',
                      }}>
                        M{regionData.strongest.magnitude.toFixed(1)}
                      </span>
                      {regionData.strongest.severity && <SeverityBadge severity={regionData.strongest.severity} />}
                    </div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                      {regionData.strongest.place || 'Unknown location'}
                    </p>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {new Date(regionData.strongest.time).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}

              {/* Magnitude distribution */}
              <div style={{ marginTop: '14px' }}>
                <h4 style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Magnitude Distribution
                </h4>
                {Object.entries(regionData.magDistribution).map(([range, count]) => {
                  const maxCount = Math.max(...Object.values(regionData.magDistribution), 1);
                  const pct = (count / maxCount) * 100;
                  const color = range === '7+' ? '#ef4444' : range === '6-7' ? '#f97316' : range === '5-6' ? '#eab308' : range === '4-5' ? '#22c55e' : '#3b82f6';
                  return (
                    <div key={range} style={{ marginBottom: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', marginBottom: '2px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>M{range}</span>
                        <span style={{ color }}>{count}</span>
                      </div>
                      <div style={{ height: '4px', background: 'var(--bg-elevated)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '2px', transition: 'width 0.5s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Recurrence intervals */}
              <div style={{ marginTop: '14px' }}>
                <h4 style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Recurrence Intervals
                </h4>
                {Object.entries(regionData.recurrenceYears).map(([range, interval]) => (
                  <div key={range} style={{ ...statRow, fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>M{range}</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>
                      {interval ? `Every ${interval} yr` : 'No data'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Recent events list */}
              {regionData.recentQuakes?.length > 0 && (
                <div style={{ marginTop: '14px' }}>
                  <h4 style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Recent Events
                  </h4>
                  {regionData.recentQuakes.slice(0, 5).map(q => (
                    <div key={q.id} style={{
                      padding: '6px 0', borderBottom: '1px solid var(--border)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <div>
                        <span style={{
                          fontSize: '0.8rem', fontWeight: 600, fontFamily: 'var(--font-mono)',
                          color: q.severity?.color || 'var(--text-primary)',
                          marginRight: '6px',
                        }}>
                          M{q.magnitude.toFixed(1)}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                          {q.place ? q.place.substring(0, 30) : 'Unknown'}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {new Date(q.time).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tooltip styling for Leaflet */}
      <style>{`
        .dark-tooltip {
          background: var(--bg-elevated) !important;
          border: 1px solid var(--border) !important;
          color: var(--text-primary) !important;
          font-family: var(--font-mono) !important;
          font-size: 0.7rem !important;
          padding: 4px 8px !important;
          border-radius: 4px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important;
        }
        .dark-tooltip::before {
          border-top-color: var(--border) !important;
        }
      `}</style>
    </div>
  );
}
