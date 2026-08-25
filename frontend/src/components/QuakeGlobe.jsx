import React, { useRef, useEffect, useMemo } from 'react';
import Globe from 'globe.gl';

const NIGHT_IMG = 'https://unpkg.com/three-globe@2.41.12/example/img/earth-night.jpg';
const BUMP_IMG = 'https://unpkg.com/three-globe@2.41.12/example/img/earth-topology.png';

function magToColor(mag) {
  if (mag >= 7) return '#ef4444';
  if (mag >= 6) return '#dc2626';
  if (mag >= 5) return '#f97316';
  if (mag >= 4) return '#eab308';
  if (mag >= 3) return '#22c55e';
  return '#52525b';
}

function magToRadius(mag) {
  return Math.max(0.3, Math.pow(1.5, mag - 2) * 0.25);
}

function magToAltitude(mag) {
  return Math.max(0.01, (mag - 1) * 0.02);
}

export default function QuakeGlobe({ quakes, height = '500px', onQuakeClick }) {
  const containerRef = useRef(null);
  const globeRef = useRef(null);
  const onClickRef = useRef(onQuakeClick);

  onClickRef.current = onQuakeClick;

  const points = useMemo(() => {
    if (!quakes?.length) return [];
    return [...quakes]
      .sort((a, b) => a.magnitude - b.magnitude)
      .slice(-500)
      .map(q => ({
        lat: q.coordinates.lat,
        lng: q.coordinates.lng,
        magnitude: q.magnitude,
        color: magToColor(q.magnitude),
        radius: magToRadius(q.magnitude),
        altitude: magToAltitude(q.magnitude),
        place: q.place,
        depth: q.coordinates.depth,
        id: q.id,
        _quake: q,
      }));
  }, [quakes]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Ensure clean state (handles React StrictMode double-mount)
    container.innerHTML = '';

    const globe = Globe()
      .globeImageUrl(NIGHT_IMG)
      .bumpImageUrl(BUMP_IMG)
      .backgroundColor('rgba(0,0,0,0)')
      .atmosphereColor('#ffffff')
      .atmosphereAltitude(0.15)
      .showAtmosphere(true)
      .pointOfView({ lat: 20, lng: 0, altitude: 2.2 })
      .pointsData([])
      .pointLat('lat')
      .pointLng('lng')
      .pointColor('color')
      .pointRadius('radius')
      .pointAltitude('altitude')
      .pointsMerge(false)
      .onPointClick((pt) => {
        if (onClickRef.current && pt._quake) onClickRef.current(pt._quake);
      })
      .ringsData([])
      .ringLat('lat')
      .ringLng('lng')
      .ringColor(() => t => `rgba(6, 182, 212, ${1 - t})`)
      .ringMaxRadius('maxR')
      .ringPropagationSpeed('propagationSpeed')
      .ringRepeatPeriod('repeatPeriod')
      (container);

    globe.controls().autoRotate = true;
    globe.controls().autoRotateSpeed = 0.5;
    globe.controls().enableDamping = true;
    globe.controls().dampingFactor = 0.1;

    globeRef.current = globe;

    const onResize = () => {
      if (!container) return;
      globe.width(container.clientWidth);
      globe.height(container.clientHeight);
    };
    window.addEventListener('resize', onResize);
    setTimeout(onResize, 100);

    return () => {
      window.removeEventListener('resize', onResize);
      globeRef.current = null;
      try {
        const renderer = globe.renderer?.();
        if (renderer) {
          renderer.dispose();
          renderer.forceContextLoss();
        }
      } catch (e) { /* ignore */ }
      container.innerHTML = '';
    };
  }, []);

  useEffect(() => {
    if (!globeRef.current) return;
    globeRef.current.pointsData(points);

    const rings = points
      .filter(p => p.magnitude >= 4)
      .map(p => ({
        lat: p.lat,
        lng: p.lng,
        maxR: Math.max(3, p.magnitude * 1.2),
        propagationSpeed: 2,
        repeatPeriod: 1200,
      }));
    globeRef.current.ringsData(rings);
  }, [points]);

  // No React children — globe.gl owns all DOM inside this div
  return (
    <div
      ref={containerRef}
      style={{
        height,
        width: '100%',
        background: '#09090b',
        overflow: 'hidden',
        cursor: 'grab',
      }}
    />
  );
}
