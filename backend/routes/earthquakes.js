const express = require('express');
const router = express.Router();
const { fetchFeed, queryEarthquakes, fetchEventDetail, fetchNearbyHistory } = require('../services/usgs');
const { formatFeed, formatQuake } = require('../services/formatters');
const { generateForecast } = require('../services/aftershock');

// GET /api/earthquakes/live?feed=all_hour
router.get('/live', async (req, res) => {
  try {
    const feed = req.query.feed || 'all_day';
    const raw = await fetchFeed(feed);
    const formatted = formatFeed(raw);
    res.json(formatted);
  } catch (err) {
    console.error('Feed error:', err.message);
    res.status(500).json({ error: 'Failed to fetch earthquake feed' });
  }
});

// GET /api/earthquakes/search?starttime=...&endtime=...&minmagnitude=...&maxradiuskm=...&latitude=...&longitude=...
router.get('/search', async (req, res) => {
  try {
    const raw = await queryEarthquakes(req.query);
    const formatted = formatFeed(raw);
    res.json(formatted);
  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).json({ error: 'Failed to search earthquakes' });
  }
});

// GET /api/earthquakes/historical/region — fetch historical quakes for a bounding box
router.get('/historical/region', async (req, res) => {
  try {
    const {
      minlat = -90, maxlat = 90,
      minlng = -180, maxlng = 180,
      minmagnitude = 4, years = 20,
    } = req.query;

    const end = new Date().toISOString().split('T')[0];
    const start = new Date(Date.now() - years * 365.25 * 86400000).toISOString().split('T')[0];

    const raw = await queryEarthquakes({
      starttime: start,
      endtime: end,
      minmagnitude,
      minlatitude: minlat,
      maxlatitude: maxlat,
      minlongitude: minlng,
      maxlongitude: maxlng,
      orderby: 'time',
      limit: 2000,
    });

    const formatted = formatFeed(raw);
    res.json(formatted);
  } catch (err) {
    console.error('Historical error:', err.message);
    res.status(500).json({ error: 'Failed to fetch historical data' });
  }
});

// GET /api/earthquakes/region/stats — risk statistics for a clicked region
router.get('/region/stats', async (req, res) => {
  try {
    const { lat, lng, radius = 300, years = 20, minmagnitude = 3 } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });

    const end = new Date().toISOString().split('T')[0];
    const start = new Date(Date.now() - years * 365.25 * 86400000).toISOString().split('T')[0];

    const raw = await fetchNearbyHistory(lat, lng, radius, start, end, minmagnitude);
    const quakes = raw.features.map(formatQuake);
    quakes.sort((a, b) => b.time - a.time);

    const strongest = quakes.reduce((max, q) => q.magnitude > (max?.magnitude || 0) ? q : max, null);
    const totalYears = parseFloat(years);
    const avgPerYear = quakes.length / totalYears;

    const magBuckets = { '3-4': 0, '4-5': 0, '5-6': 0, '6-7': 0, '7+': 0 };
    quakes.forEach(q => {
      if (q.magnitude >= 7) magBuckets['7+']++;
      else if (q.magnitude >= 6) magBuckets['6-7']++;
      else if (q.magnitude >= 5) magBuckets['5-6']++;
      else if (q.magnitude >= 4) magBuckets['4-5']++;
      else magBuckets['3-4']++;
    });

    const recurrence = {};
    for (const [bucket, count] of Object.entries(magBuckets)) {
      recurrence[bucket] = count > 0 ? Math.round((totalYears / count) * 10) / 10 : null;
    }

    res.json({
      region: { lat: parseFloat(lat), lng: parseFloat(lng), radiusKm: parseFloat(radius) },
      totalEvents: quakes.length,
      yearsAnalyzed: totalYears,
      avgPerYear: Math.round(avgPerYear * 10) / 10,
      strongest,
      magDistribution: magBuckets,
      recurrenceYears: recurrence,
      recentQuakes: quakes.slice(0, 10),
    });
  } catch (err) {
    console.error('Region stats error:', err.message);
    res.status(500).json({ error: 'Failed to compute region statistics' });
  }
});

// GET /api/earthquakes/:id
router.get('/:id', async (req, res) => {
  try {
    const raw = await fetchEventDetail(req.params.id);
    const quake = formatQuake(raw);
    res.json(quake);
  } catch (err) {
    console.error('Detail error:', err.message);
    res.status(500).json({ error: 'Failed to fetch earthquake details' });
  }
});

// GET /api/earthquakes/:id/aftershock-forecast
router.get('/:id/aftershock-forecast', async (req, res) => {
  try {
    const raw = await fetchEventDetail(req.params.id);
    const quake = formatQuake(raw);

    if (quake.magnitude < 4) {
      return res.json({
        message: 'Aftershock forecasting is only meaningful for earthquakes M4.0 and above.',
        quake: { id: quake.id, magnitude: quake.magnitude, place: quake.place },
      });
    }

    const forecast = generateForecast(quake.magnitude, quake.time);
    forecast.quake = {
      id: quake.id,
      magnitude: quake.magnitude,
      place: quake.place,
      coordinates: quake.coordinates,
    };

    // Also fetch recent nearby activity for context
    const [lng, lat] = [quake.coordinates.lng, quake.coordinates.lat];
    const startDate = new Date(quake.time).toISOString().split('T')[0];
    const nearbyRaw = await fetchNearbyHistory(lat, lng, 100, startDate, new Date().toISOString().split('T')[0], 1);
    forecast.nearbyActivity = {
      count: nearbyRaw.features.length,
      quakes: nearbyRaw.features.slice(0, 20).map(formatQuake),
    };

    res.json(forecast);
  } catch (err) {
    console.error('Forecast error:', err.message);
    res.status(500).json({ error: 'Failed to generate aftershock forecast' });
  }
});

// GET /api/earthquakes/nearby?lat=...&lng=...&radius=100&days=30&minmag=2
router.get('/nearby/search', async (req, res) => {
  try {
    const { lat, lng, radius = 100, days = 30, minmag = 2 } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }

    const end = new Date().toISOString().split('T')[0];
    const start = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
    const raw = await fetchNearbyHistory(lat, lng, radius, start, end, minmag);
    const formatted = formatFeed(raw);
    res.json(formatted);
  } catch (err) {
    console.error('Nearby error:', err.message);
    res.status(500).json({ error: 'Failed to search nearby earthquakes' });
  }
});

module.exports = router;
