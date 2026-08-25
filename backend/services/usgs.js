const fetch = require('node-fetch');

const USGS_BASE = 'https://earthquake.usgs.gov';

// Real-time GeoJSON feeds (updated every minute)
const FEEDS = {
  all_hour: `${USGS_BASE}/earthquakes/feed/v1.0/summary/all_hour.geojson`,
  all_day: `${USGS_BASE}/earthquakes/feed/v1.0/summary/all_day.geojson`,
  all_week: `${USGS_BASE}/earthquakes/feed/v1.0/summary/all_week.geojson`,
  significant_week: `${USGS_BASE}/earthquakes/feed/v1.0/summary/significant_week.geojson`,
  significant_month: `${USGS_BASE}/earthquakes/feed/v1.0/summary/significant_month.geojson`,
  m45_day: `${USGS_BASE}/earthquakes/feed/v1.0/summary/4.5_day.geojson`,
  m25_day: `${USGS_BASE}/earthquakes/feed/v1.0/summary/2.5_day.geojson`,
};

async function fetchFeed(feedName) {
  const url = FEEDS[feedName];
  if (!url) throw new Error(`Unknown feed: ${feedName}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`USGS feed error: ${res.status}`);
  return res.json();
}

// Custom query using FDSN API
async function queryEarthquakes(params) {
  const query = new URLSearchParams({
    format: 'geojson',
    ...params,
  });
  const url = `${USGS_BASE}/fdsnws/event/1/query?${query}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`USGS query error: ${res.status}`);
  return res.json();
}

// Get detail for a single event
async function fetchEventDetail(eventId) {
  const url = `${USGS_BASE}/fdsnws/event/1/query?eventid=${eventId}&format=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`USGS detail error: ${res.status}`);
  return res.json();
}

// Get historical quakes near a location (for aftershock analysis)
async function fetchNearbyHistory(lat, lng, radiusKm, startDate, endDate, minMag) {
  return queryEarthquakes({
    latitude: lat,
    longitude: lng,
    maxradiuskm: radiusKm,
    starttime: startDate,
    endtime: endDate,
    minmagnitude: minMag || 1,
    orderby: 'time',
    limit: 500,
  });
}

module.exports = { fetchFeed, queryEarthquakes, fetchEventDetail, fetchNearbyHistory, FEEDS };
