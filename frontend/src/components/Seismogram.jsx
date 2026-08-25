import React, { useRef, useEffect, useState, useMemo } from 'react';

// Generates a realistic synthetic seismogram based on earthquake parameters.
// Models P-wave and S-wave arrivals as damped sinusoids with magnitude-scaled amplitude.
// P-waves travel faster (~6 km/s) and arrive first; S-waves (~3.5 km/s) arrive later with larger amplitude.

function generateWaveformData(magnitude, depthKm, distanceKm = 500, sampleRate = 200, durationSec = 30) {
  const samples = sampleRate * durationSec;
  const data = new Float32Array(samples);

  // Wave velocities (simplified, km/s)
  const pWaveVelocity = 6.0;
  const sWaveVelocity = 3.5;

  // Travel times in seconds
  const totalDistance = Math.sqrt(distanceKm * distanceKm + depthKm * depthKm);
  const pArrival = totalDistance / pWaveVelocity;
  const sArrival = totalDistance / sWaveVelocity;

  // Amplitude scales with magnitude (exponential energy release)
  const baseAmplitude = Math.pow(10, (magnitude - 2) * 0.5);

  // Background noise (microseismic noise)
  for (let i = 0; i < samples; i++) {
    data[i] = (Math.random() - 0.5) * 0.03 * baseAmplitude;
  }

  // P-wave: lower amplitude, higher frequency, arrives first
  const pFreq = 4 + Math.random() * 2;
  const pAmplitude = baseAmplitude * 0.3;
  const pDecay = 1.5 + magnitude * 0.3;

  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    if (t < pArrival) continue;
    const dt = t - pArrival;
    const envelope = pAmplitude * Math.exp(-dt / pDecay);
    if (envelope < 0.001) continue;
    // Damped sinusoid with slight frequency variation
    const freq = pFreq * (1 - dt * 0.02);
    data[i] += envelope * Math.sin(2 * Math.PI * freq * dt + Math.sin(dt * 3) * 0.5);
  }

  // S-wave: higher amplitude, lower frequency, arrives later
  const sFreq = 1.5 + Math.random() * 1.5;
  const sAmplitude = baseAmplitude * 0.8;
  const sDecay = 2.5 + magnitude * 0.5;

  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    if (t < sArrival) continue;
    const dt = t - sArrival;
    const envelope = sAmplitude * Math.exp(-dt / sDecay);
    if (envelope < 0.001) continue;
    const freq = sFreq * (1 - dt * 0.015);
    data[i] += envelope * Math.sin(2 * Math.PI * freq * dt + Math.cos(dt * 2) * 0.8);
  }

  // Surface waves: even higher amplitude, very low frequency, arrive after S-wave
  const surfaceVelocity = 2.8;
  const surfaceArrival = totalDistance / surfaceVelocity;
  const surfaceFreq = 0.5 + Math.random() * 0.5;
  const surfaceAmplitude = baseAmplitude * 1.0;
  const surfaceDecay = 4 + magnitude * 0.7;

  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    if (t < surfaceArrival) continue;
    const dt = t - surfaceArrival;
    const envelope = surfaceAmplitude * Math.exp(-dt / surfaceDecay);
    if (envelope < 0.001) continue;
    data[i] += envelope * Math.sin(2 * Math.PI * surfaceFreq * dt);
  }

  // Normalize to [-1, 1]
  let maxVal = 0;
  for (let i = 0; i < samples; i++) {
    maxVal = Math.max(maxVal, Math.abs(data[i]));
  }
  if (maxVal > 0) {
    for (let i = 0; i < samples; i++) {
      data[i] /= maxVal;
    }
  }

  return { data, sampleRate, pArrival, sArrival, surfaceArrival, durationSec };
}

export default function Seismogram({ magnitude, depthKm, distanceKm = 500 }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(true);

  const waveform = useMemo(
    () => generateWaveformData(magnitude, depthKm, distanceKm),
    [magnitude, depthKm, distanceKm]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();

    const { data, sampleRate, pArrival, sArrival, durationSec } = waveform;
    const totalSamples = data.length;

    const W = canvas.getBoundingClientRect().width;
    const H = canvas.getBoundingClientRect().height;
    const padTop = 30;
    const padBottom = 30;
    const padLeft = 50;
    const padRight = 20;
    const plotW = W - padLeft - padRight;
    const plotH = H - padTop - padBottom;
    const midY = padTop + plotH / 2;

    // Drawing speed: reveal the full waveform over ~4 seconds
    const drawDuration = 4000;
    let startTime = null;
    let drawnSamples = 0;

    const draw = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / drawDuration, 1);
      const targetSamples = Math.floor(progress * totalSamples);

      // Clear and redraw everything
      ctx.clearRect(0, 0, W, H);

      // Background
      ctx.fillStyle = '#111114';
      ctx.fillRect(0, 0, W, H);

      // Grid lines (horizontal)
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= 4; i++) {
        const y = padTop + (plotH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(padLeft + plotW, y);
        ctx.stroke();
      }

      // Grid lines (vertical) — every 5 seconds
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillStyle = '#52525b';
      ctx.textAlign = 'center';
      for (let t = 0; t <= durationSec; t += 5) {
        const x = padLeft + (t / durationSec) * plotW;
        ctx.beginPath();
        ctx.moveTo(x, padTop);
        ctx.lineTo(x, padTop + plotH);
        ctx.stroke();
        ctx.fillText(t + 's', x, H - 8);
      }

      // Y-axis label
      ctx.save();
      ctx.fillStyle = '#52525b';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.translate(12, midY);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('Amplitude', 0, 0);
      ctx.restore();

      // P-wave arrival marker
      const pX = padLeft + (pArrival / durationSec) * plotW;
      if (pArrival / durationSec * totalSamples <= targetSamples) {
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(pX, padTop);
        ctx.lineTo(pX, padTop + plotH);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#f97316';
        ctx.font = 'bold 11px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('P', pX, padTop - 8);
      }

      // S-wave arrival marker
      const sX = padLeft + (sArrival / durationSec) * plotW;
      if (sArrival / durationSec * totalSamples <= targetSamples) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(sX, padTop);
        ctx.lineTo(sX, padTop + plotH);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 11px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('S', sX, padTop - 8);
      }

      // Draw waveform (animated left-to-right reveal)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.2;
      ctx.beginPath();

      // Downsample for drawing — show ~2 points per pixel
      const step = Math.max(1, Math.floor(totalSamples / (plotW * 2)));

      for (let i = 0; i < targetSamples; i += step) {
        const x = padLeft + (i / totalSamples) * plotW;
        const y = midY - data[i] * (plotH * 0.45);

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Scanning line at the current draw position
      if (progress < 1) {
        const scanX = padLeft + progress * plotW;
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(scanX, padTop);
        ctx.lineTo(scanX, padTop + plotH);
        ctx.stroke();
      }

      // Title
      ctx.fillStyle = '#a1a1aa';
      ctx.font = '11px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`Synthetic Seismogram — M${magnitude.toFixed(1)} at ${depthKm.toFixed(0)} km depth`, padLeft, padTop - 14);

      // Legend
      ctx.textAlign = 'right';
      ctx.fillStyle = '#f97316';
      ctx.fillText('P-wave', W - padRight, padTop - 14);
      ctx.fillStyle = '#ef4444';
      ctx.fillText('S-wave', W - padRight - 70, padTop - 14);

      drawnSamples = targetSamples;

      if (progress < 1) {
        animRef.current = requestAnimationFrame(draw);
      } else {
        setIsDrawing(false);
      }
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [waveform, magnitude, depthKm]);

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '6px',
      padding: '16px',
      marginTop: '16px',
    }}>
      <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '8px' }}>
        Seismic Waveform
      </h3>
      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '12px' }}>
        Synthetic seismogram generated from earthquake parameters · P-wave and S-wave arrivals modeled using damped sinusoids
      </p>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '200px',
          borderRadius: '4px',
          border: '1px solid var(--border)',
        }}
      />
    </div>
  );
}
