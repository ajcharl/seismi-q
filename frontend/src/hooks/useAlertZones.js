import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'seismiq_alert_zones';

// Manages user-defined alert zones stored in localStorage.
// Each zone: { id, name, lat, lng, radiusKm, minMagnitude, enabled }
export function useAlertZones() {
  const [zones, setZones] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(zones));
  }, [zones]);

  const addZone = useCallback((zone) => {
    const newZone = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: zone.name || `Zone ${zones.length + 1}`,
      lat: zone.lat,
      lng: zone.lng,
      radiusKm: zone.radiusKm || 200,
      minMagnitude: zone.minMagnitude || 4,
      enabled: true,
    };
    setZones(prev => [...prev, newZone]);
    return newZone;
  }, [zones.length]);

  const removeZone = useCallback((id) => {
    setZones(prev => prev.filter(z => z.id !== id));
  }, []);

  const updateZone = useCallback((id, updates) => {
    setZones(prev => prev.map(z => z.id === id ? { ...z, ...updates } : z));
  }, []);

  const toggleZone = useCallback((id) => {
    setZones(prev => prev.map(z => z.id === id ? { ...z, enabled: !z.enabled } : z));
  }, []);

  return { zones, addZone, removeZone, updateZone, toggleZone };
}

// Haversine distance in km between two lat/lng points
export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Check if a quake falls within any enabled alert zone
export function matchesAlertZone(quake, zones) {
  return zones.filter(z => {
    if (!z.enabled) return false;
    if (quake.magnitude < z.minMagnitude) return false;
    const dist = haversineKm(z.lat, z.lng, quake.coordinates.lat, quake.coordinates.lng);
    return dist <= z.radiusKm;
  });
}

// Request browser notification permission
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return await Notification.requestPermission();
}

// Send a browser notification for a quake in an alert zone
export function sendQuakeNotification(quake, zone) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const title = `M${quake.magnitude.toFixed(1)} Earthquake`;
  const body = `${quake.place || 'Unknown location'}\nDepth: ${quake.coordinates?.depth?.toFixed(0) || '?'} km\nAlert Zone: ${zone.name}`;

  new Notification(title, {
    body,
    icon: 'data:image/svg+xml,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#ef4444"/><text x="50" y="62" text-anchor="middle" font-size="32" font-weight="bold" fill="white">M${Math.round(quake.magnitude)}</text></svg>`
    ),
    tag: quake.id,
    requireInteraction: quake.magnitude >= 5,
  });
}
