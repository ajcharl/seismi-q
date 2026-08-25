const express = require('express');
const router = express.Router();

// In-memory alert zones (would use a database in production)
let alertZones = [];
let alertIdCounter = 1;

// POST /api/alerts/zones — create a monitoring zone
router.post('/zones', (req, res) => {
  const { name, lat, lng, radiusKm, minMagnitude } = req.body;

  if (!name || !lat || !lng) {
    return res.status(400).json({ error: 'name, lat, and lng are required' });
  }

  const zone = {
    id: alertIdCounter++,
    name,
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    radiusKm: parseFloat(radiusKm) || 200,
    minMagnitude: parseFloat(minMagnitude) || 3.0,
    createdAt: new Date().toISOString(),
    active: true,
  };

  alertZones.push(zone);
  res.status(201).json(zone);
});

// GET /api/alerts/zones — list all monitoring zones
router.get('/zones', (req, res) => {
  res.json(alertZones);
});

// DELETE /api/alerts/zones/:id
router.delete('/zones/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = alertZones.findIndex(z => z.id === id);
  if (index === -1) return res.status(404).json({ error: 'Zone not found' });

  alertZones.splice(index, 1);
  res.json({ deleted: true });
});

// GET /api/alerts/check — check all zones against recent quakes
router.get('/check', async (req, res) => {
  const fetch = require('node-fetch');
  try {
    const feedRes = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson');
    const feed = await feedRes.json();

    const triggered = [];

    for (const zone of alertZones.filter(z => z.active)) {
      for (const feature of feed.features) {
        const [lng, lat] = feature.geometry.coordinates;
        const mag = feature.properties.mag;

        if (mag < zone.minMagnitude) continue;

        const dist = haversineKm(zone.lat, zone.lng, lat, lng);
        if (dist <= zone.radiusKm) {
          triggered.push({
            zone: zone.name,
            zoneId: zone.id,
            earthquake: {
              id: feature.id,
              magnitude: mag,
              place: feature.properties.place,
              time: new Date(feature.properties.time).toISOString(),
              distanceFromZoneKm: Math.round(dist),
            },
          });
        }
      }
    }

    res.json({
      checked: alertZones.length,
      triggered: triggered.length,
      alerts: triggered,
    });
  } catch (err) {
    console.error('Alert check error:', err.message);
    res.status(500).json({ error: 'Failed to check alerts' });
  }
});

// Haversine distance in km
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) { return deg * Math.PI / 180; }

module.exports = router;
