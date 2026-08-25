import React, { useRef, useEffect, useMemo } from 'react';
import { useAftershockForecast } from '../hooks/useEarthquakes';

const probBar = (pct) => ({
  height: '6px',
  borderRadius: '3px',
  background: 'var(--border)',
  overflow: 'hidden',
  flex: 1,
});

const probFill = (pct) => ({
  height: '100%',
  borderRadius: '3px',
  width: `${Math.min(pct, 100)}%`,
  background: pct > 70 ? 'var(--seismic-red)' :
    pct > 40 ? 'var(--seismic-orange)' :
    pct > 15 ? 'var(--seismic-yellow)' : 'var(--seismic-green)',
  transition: 'width 0.5s ease',
});

const sectionTitle = {
  fontSize: '0.7rem',
  fontFamily: 'var(--font-mono)',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: '8px',
};

// Draws the Omori decay curve showing aftershock rate over 30 days
function OmoriCurve({ mainshockMag, daysSince, nearbyQuakes, mainshockTime }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const pad = { top: 20, right: 16, bottom: 30, left: 44 };
    const plotW = W - pad.left - pad.right;
    const plotH = H - pad.top - pad.bottom;

    // Background
    ctx.fillStyle = '#111114';
    ctx.fillRect(0, 0, W, H);

    // Omori parameters
    const p = 1.05;
    const c = 0.05;
    const a = mainshockMag - 1.0;
    const K = Math.pow(10, a - 3); // rate for M3+
    const maxDays = 30;

    // Compute Omori curve points
    const curvePoints = [];
    let maxRate = 0;
    for (let i = 0; i <= 200; i++) {
      const t = (i / 200) * maxDays;
      const rate = K / Math.pow(c + t, p);
      maxRate = Math.max(maxRate, rate);
      curvePoints.push({ t, rate });
    }

    // Grid lines
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (plotH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + plotW, y);
      ctx.stroke();
    }

    // X-axis labels
    ctx.fillStyle = '#52525b';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    for (let d = 0; d <= 30; d += 5) {
      const x = pad.left + (d / maxDays) * plotW;
      ctx.beginPath();
      ctx.moveTo(x, pad.top);
      ctx.lineTo(x, pad.top + plotH);
      ctx.stroke();
      ctx.fillText(`${d}d`, x, H - 8);
    }

    // Y-axis label
    ctx.save();
    ctx.fillStyle = '#52525b';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.translate(12, pad.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Rate', 0, 0);
    ctx.restore();

    // Draw Omori curve
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2;
    ctx.beginPath();
    curvePoints.forEach((pt, i) => {
      const x = pad.left + (pt.t / maxDays) * plotW;
      const y = pad.top + plotH - (pt.rate / maxRate) * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Fill under curve
    ctx.lineTo(pad.left + plotW, pad.top + plotH);
    ctx.lineTo(pad.left, pad.top + plotH);
    ctx.closePath();
    ctx.fillStyle = 'rgba(249, 115, 22, 0.08)';
    ctx.fill();

    // "Now" marker
    if (daysSince <= maxDays) {
      const nowX = pad.left + (daysSince / maxDays) * plotW;
      ctx.strokeStyle = 'var(--seismic-cyan)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(nowX, pad.top);
      ctx.lineTo(nowX, pad.top + plotH);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#06b6d4';
      ctx.font = 'bold 10px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('NOW', nowX, pad.top - 6);
    }

    // Plot actual aftershocks as dots on the timeline
    if (nearbyQuakes && mainshockTime) {
      nearbyQuakes.forEach(q => {
        const qDays = (q.time - mainshockTime) / (1000 * 60 * 60 * 24);
        if (qDays < 0 || qDays > maxDays) return;
        const x = pad.left + (qDays / maxDays) * plotW;
        const magNorm = Math.min((q.magnitude - 2) / 5, 1);
        const y = pad.top + plotH - magNorm * plotH * 0.8;
        const r = Math.max(2, (q.magnitude - 2) * 1.5);

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = q.magnitude >= 5 ? 'rgba(239, 68, 68, 0.8)' :
          q.magnitude >= 4 ? 'rgba(249, 115, 22, 0.7)' : 'rgba(6, 182, 212, 0.6)';
        ctx.fill();
      });
    }

    // Title
    ctx.fillStyle = '#a1a1aa';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Omori Decay Curve (M3+ rate)', pad.left, pad.top - 6);

    // Legend
    ctx.textAlign = 'right';
    ctx.fillStyle = '#f97316';
    ctx.fillText('Predicted', W - pad.right, pad.top - 6);
    ctx.fillStyle = '#06b6d4';
    ctx.fillText('Actual', W - pad.right - 70, pad.top - 6);
  }, [mainshockMag, daysSince, nearbyQuakes, mainshockTime]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '180px', borderRadius: '4px', border: '1px solid var(--border)' }}
    />
  );
}

// Gutenberg-Richter magnitude-frequency chart
function MagFreqChart({ mainshockMag, nearbyQuakes }) {
  const canvasRef = useRef(null);

  // Compute actual and predicted magnitude distribution
  const { actual, predicted } = useMemo(() => {
    const buckets = [3, 4, 5, 6, 7];
    const a = mainshockMag - 1.0;
    const b = 1.0;

    const pred = {};
    const act = {};
    buckets.forEach(m => {
      if (m >= mainshockMag) return;
      pred[m] = Math.pow(10, a - b * m);
      act[m] = 0;
    });

    if (nearbyQuakes) {
      nearbyQuakes.forEach(q => {
        const m = Math.floor(q.magnitude);
        if (act[m] !== undefined) act[m]++;
      });
    }

    return { actual: act, predicted: pred };
  }, [mainshockMag, nearbyQuakes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const pad = { top: 20, right: 16, bottom: 30, left: 44 };
    const plotW = W - pad.left - pad.right;
    const plotH = H - pad.top - pad.bottom;

    ctx.fillStyle = '#111114';
    ctx.fillRect(0, 0, W, H);

    const mags = Object.keys(predicted).map(Number).sort();
    if (mags.length === 0) return;

    const allValues = [...Object.values(predicted), ...Object.values(actual)].filter(v => v > 0);
    const maxVal = Math.max(...allValues, 1);

    const barWidth = plotW / (mags.length * 3);

    mags.forEach((m, i) => {
      const groupX = pad.left + (i / mags.length) * plotW + plotW / (mags.length * 2);

      // Predicted bar
      const predH = (predicted[m] / maxVal) * plotH;
      ctx.fillStyle = 'rgba(249, 115, 22, 0.5)';
      ctx.fillRect(groupX - barWidth - 1, pad.top + plotH - predH, barWidth, predH);
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 1;
      ctx.strokeRect(groupX - barWidth - 1, pad.top + plotH - predH, barWidth, predH);

      // Actual bar
      const actH = actual[m] > 0 ? (actual[m] / maxVal) * plotH : 0;
      ctx.fillStyle = 'rgba(6, 182, 212, 0.5)';
      ctx.fillRect(groupX + 1, pad.top + plotH - actH, barWidth, actH);
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1;
      ctx.strokeRect(groupX + 1, pad.top + plotH - actH, barWidth, actH);

      // Label
      ctx.fillStyle = '#52525b';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`M${m}+`, groupX, H - 8);
    });

    // Grid
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (plotH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + plotW, y);
      ctx.stroke();
    }

    // Title
    ctx.fillStyle = '#a1a1aa';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Magnitude-Frequency (G-R)', pad.left, pad.top - 6);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#f97316';
    ctx.fillText('Predicted', W - pad.right, pad.top - 6);
    ctx.fillStyle = '#06b6d4';
    ctx.fillText('Actual', W - pad.right - 70, pad.top - 6);
  }, [predicted, actual]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '180px', borderRadius: '4px', border: '1px solid var(--border)' }}
    />
  );
}

// Mini Leaflet map showing aftershock zone
function AftershockZoneMap({ mainLat, mainLng, nearbyQuakes }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const L = window.L;
    if (!L) return;

    const map = L.map(mapRef.current, {
      center: [mainLat, mainLng],
      zoom: 7,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
    }).addTo(map);

    // Mainshock marker
    L.circleMarker([mainLat, mainLng], {
      radius: 10,
      fillColor: '#ef4444',
      fillOpacity: 0.9,
      color: '#ef4444',
      weight: 2,
    }).addTo(map).bindTooltip('Mainshock', { permanent: false });

    // Aftershock zone circle (100km radius)
    L.circle([mainLat, mainLng], {
      radius: 100000,
      color: 'rgba(249, 115, 22, 0.4)',
      fillColor: 'rgba(249, 115, 22, 0.05)',
      fillOpacity: 0.3,
      weight: 1,
      dashArray: '6, 4',
    }).addTo(map);

    // Aftershock markers
    if (nearbyQuakes) {
      nearbyQuakes.forEach(q => {
        const r = Math.max(3, (q.magnitude - 2) * 2);
        const color = q.magnitude >= 5 ? '#ef4444' : q.magnitude >= 4 ? '#f97316' : '#06b6d4';
        L.circleMarker([q.coordinates.lat, q.coordinates.lng], {
          radius: r,
          fillColor: color,
          fillOpacity: 0.7,
          color: 'transparent',
          weight: 0,
        }).addTo(map).bindTooltip(
          `M${q.magnitude.toFixed(1)} · ${q.place || 'Unknown'}`,
          { className: 'dark-tooltip' }
        );
      });
    }

    mapInstanceRef.current = map;
    return () => { map.remove(); mapInstanceRef.current = null; };
  }, [mainLat, mainLng, nearbyQuakes]);

  return (
    <div
      ref={mapRef}
      style={{
        width: '100%',
        height: '200px',
        borderRadius: '4px',
        border: '1px solid var(--border)',
        background: '#111114',
      }}
    />
  );
}

export default function AftershockForecast({ quakeId }) {
  const { data, loading, error } = useAftershockForecast(quakeId);

  if (loading) return <p style={{ color: 'var(--text-secondary)', padding: '16px' }}>Computing aftershock probabilities...</p>;
  if (error) return <p style={{ color: 'var(--seismic-red)', padding: '16px' }}>Forecast unavailable.</p>;
  if (!data || data.message) return <p style={{ color: 'var(--text-muted)', padding: '16px' }}>{data?.message || 'No forecast available.'}</p>;

  const nearbyQuakes = data.nearbyActivity?.quakes || [];
  const mainCoords = data.quake?.coordinates;

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', padding: '20px', marginTop: '16px' }}>
      <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '4px' }}>
        Aftershock Forecast
      </h3>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>
        {data.mainshock.daysSince} days since mainshock · Largest expected aftershock: M{data.largestExpectedAftershock}
        {nearbyQuakes.length > 0 && ` · ${nearbyQuakes.length} aftershocks detected`}
      </p>

      {/* Probability bars */}
      {data.forecast.map((window, wi) => (
        <div key={wi} style={{ marginTop: '16px' }}>
          <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--seismic-cyan)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {window.window}
          </div>
          {window.predictions.map((p, pi) => (
            <div key={pi} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{ width: '36px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                {p.magnitudeThreshold}
              </span>
              <div style={probBar(p.probability)}>
                <div style={probFill(p.probability)} />
              </div>
              <span style={{ width: '48px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', textAlign: 'right' }}>
                {p.probability}%
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                (~{p.expectedCount})
              </span>
            </div>
          ))}
        </div>
      ))}

      {/* Visualizations grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '20px' }}>
        {/* Omori decay curve */}
        <div>
          <h4 style={sectionTitle}>Omori Decay Timeline</h4>
          <OmoriCurve
            mainshockMag={data.mainshock.magnitude}
            daysSince={data.mainshock.daysSince}
            nearbyQuakes={nearbyQuakes}
            mainshockTime={data.mainshock.time}
          />
        </div>

        {/* Magnitude-frequency chart */}
        <div>
          <h4 style={sectionTitle}>Magnitude-Frequency Distribution</h4>
          <MagFreqChart
            mainshockMag={data.mainshock.magnitude}
            nearbyQuakes={nearbyQuakes}
          />
        </div>
      </div>

      {/* Aftershock zone map */}
      {mainCoords && (
        <div style={{ marginTop: '16px' }}>
          <h4 style={sectionTitle}>Aftershock Zone (100km radius)</h4>
          <AftershockZoneMap
            mainLat={mainCoords.lat}
            mainLng={mainCoords.lng}
            nearbyQuakes={nearbyQuakes}
          />
        </div>
      )}

      {/* Actual vs predicted summary */}
      {nearbyQuakes.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <h4 style={sectionTitle}>Actual vs Predicted Comparison</h4>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[3, 4, 5].filter(m => m < data.mainshock.magnitude).map(m => {
              const actualCount = nearbyQuakes.filter(q => q.magnitude >= m).length;
              const predWindow = data.forecast.find(f => f.forecastDays === 30);
              const pred = predWindow?.predictions.find(p => p.minMagnitude === m);
              const predictedCount = pred?.expectedCount || 0;
              const ratio = predictedCount > 0 ? (actualCount / predictedCount * 100).toFixed(0) : '—';
              const color = actualCount > predictedCount * 1.5 ? '#ef4444' :
                actualCount < predictedCount * 0.5 ? '#22c55e' : '#eab308';

              return (
                <div key={m} style={{
                  flex: '1', minWidth: '100px', padding: '10px',
                  background: 'var(--bg-elevated)', borderRadius: '4px',
                  border: '1px solid var(--border)', textAlign: 'center',
                }}>
                  <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    M{m}+
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#06b6d4' }}>
                        {actualCount}
                      </div>
                      <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>Actual</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#f97316' }}>
                        {predictedCount}
                      </div>
                      <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>Predicted</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color, marginTop: '4px' }}>
                    {ratio}% of predicted
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '16px', lineHeight: 1.5 }}>
        {data.disclaimer}
      </p>
    </div>
  );
}
