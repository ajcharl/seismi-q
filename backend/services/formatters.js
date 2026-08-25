function formatQuake(feature) {
  const p = feature.properties;
  const [lng, lat, depth] = feature.geometry.coordinates;

  return {
    id: feature.id,
    magnitude: p.mag,
    place: p.place,
    time: p.time,
    timeISO: new Date(p.time).toISOString(),
    updated: p.updated,
    coordinates: { lat, lng, depth },
    severity: classifySeverity(p.mag),
    felt: p.felt,
    cdi: p.cdi,        // community decimal intensity
    mmi: p.mmi,        // modified mercalli intensity
    alert: p.alert,    // green, yellow, orange, red
    tsunami: p.tsunami === 1,
    significance: p.sig,
    magType: p.magType,
    type: p.type,
    url: p.url,
    detailUrl: p.detail,
    status: p.status,
    rms: p.rms,
    gap: p.gap,
  };
}

function classifySeverity(mag) {
  if (mag >= 7) return { level: 'extreme', label: 'Major', color: '#7f1d1d' };
  if (mag >= 6) return { level: 'severe', label: 'Strong', color: '#dc2626' };
  if (mag >= 5) return { level: 'high', label: 'Moderate', color: '#f97316' };
  if (mag >= 4) return { level: 'medium', label: 'Light', color: '#eab308' };
  if (mag >= 3) return { level: 'low', label: 'Minor', color: '#22c55e' };
  return { level: 'micro', label: 'Micro', color: '#6b7280' };
}

function formatFeed(geojson) {
  const quakes = geojson.features.map(formatQuake);

  // Sort by time (most recent first)
  quakes.sort((a, b) => b.time - a.time);

  const significant = quakes.filter(q => q.magnitude >= 4.5);
  const withTsunami = quakes.filter(q => q.tsunami);
  const feltQuakes = quakes.filter(q => q.felt && q.felt > 0);

  return {
    metadata: {
      generated: geojson.metadata.generated,
      title: geojson.metadata.title,
      count: geojson.metadata.count,
    },
    quakes,
    stats: {
      total: quakes.length,
      significant: significant.length,
      tsunamiWarnings: withTsunami.length,
      feltByPeople: feltQuakes.length,
      strongest: quakes.reduce((max, q) => q.magnitude > (max?.magnitude || 0) ? q : max, null),
      shallowest: quakes.reduce((min, q) =>
        q.coordinates.depth < (min?.coordinates?.depth ?? Infinity) ? q : min, null),
      byMagnitude: {
        extreme: quakes.filter(q => q.magnitude >= 7).length,
        severe: quakes.filter(q => q.magnitude >= 6 && q.magnitude < 7).length,
        high: quakes.filter(q => q.magnitude >= 5 && q.magnitude < 6).length,
        medium: quakes.filter(q => q.magnitude >= 4 && q.magnitude < 5).length,
        low: quakes.filter(q => q.magnitude >= 3 && q.magnitude < 4).length,
        micro: quakes.filter(q => q.magnitude < 3).length,
      },
    },
  };
}

module.exports = { formatQuake, classifySeverity, formatFeed };
