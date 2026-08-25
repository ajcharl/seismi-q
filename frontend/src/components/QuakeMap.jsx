import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '&copy; OpenStreetMap &copy; CARTO';

function magToRadius(mag) {
  return Math.max(3, Math.pow(2, mag) * 0.8);
}

function magToColor(mag) {
  if (mag >= 7) return '#7f1d1d';
  if (mag >= 6) return '#dc2626';
  if (mag >= 5) return '#f97316';
  if (mag >= 4) return '#eab308';
  if (mag >= 3) return '#22c55e';
  return '#6b7280';
}

export default function QuakeMap({ quakes, height = '400px', onQuakeClick }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current, {
        center: [20, 0],
        zoom: 2,
        zoomControl: true,
        attributionControl: true,
      });
      L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 18 }).addTo(mapInstance.current);
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstance.current || !quakes?.length) return;

    // Clear old markers
    if (markersRef.current) {
      markersRef.current.clearLayers();
    }

    const markers = L.layerGroup();

    quakes.forEach(q => {
      const circle = L.circleMarker([q.coordinates.lat, q.coordinates.lng], {
        radius: magToRadius(q.magnitude),
        fillColor: magToColor(q.magnitude),
        color: magToColor(q.magnitude),
        weight: 1,
        opacity: 0.8,
        fillOpacity: 0.5,
      });

      circle.bindPopup(`
        <div style="font-family: Inter, sans-serif; font-size: 13px;">
          <strong>M${q.magnitude.toFixed(1)}</strong> — ${q.place || 'Unknown'}<br/>
          Depth: ${q.coordinates.depth.toFixed(1)} km<br/>
          ${new Date(q.time).toLocaleString()}
          ${q.tsunami ? '<br/><span style="color:#ef4444;">⚠ Tsunami alert</span>' : ''}
        </div>
      `);

      if (onQuakeClick) {
        circle.on('click', () => onQuakeClick(q));
      }

      markers.addLayer(circle);
    });

    markers.addTo(mapInstance.current);
    markersRef.current = markers;
  }, [quakes, onQuakeClick]);

  return (
    <div
      ref={mapRef}
      style={{
        height,
        width: '100%',
        borderRadius: '6px',
        border: '1px solid var(--border)',
        marginBottom: '20px',
      }}
    />
  );
}
