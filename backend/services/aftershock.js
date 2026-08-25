/**
 * Aftershock probability estimation using established seismological models.
 *
 * Bath's Law: The largest aftershock is typically ~1.2 magnitudes below the mainshock.
 * Omori's Law: Aftershock rate decays as n(t) = K / (c + t)^p
 *   where t = time since mainshock, p ≈ 1.0, c ≈ 0.05 days, K depends on mainshock magnitude.
 * Gutenberg-Richter: log10(N) = a - bM
 *   relates number of quakes N at or above magnitude M. b ≈ 1.0 globally.
 *
 * These are simplified models used for educational demonstration.
 * Real seismological forecasting is far more complex.
 */

// Estimate expected number of aftershocks above a given magnitude
// within a time window after the mainshock
function estimateAftershocks(mainshockMag, daysSinceMainshock, forecastDays, minAftershockMag) {
  // Gutenberg-Richter parameters
  const b = 1.0;
  const a = mainshockMag - 1.0; // calibrated so total expected aftershocks scale with mainshock

  // Expected total aftershocks above minAftershockMag (Gutenberg-Richter)
  const totalExpected = Math.pow(10, a - b * minAftershockMag);

  // Omori's law parameters
  const p = 1.05;
  const c = 0.05; // days

  // Fraction of aftershocks that occur in [daysSinceMainshock, daysSinceMainshock + forecastDays]
  // Integral of 1/(c+t)^p from t1 to t2
  const t1 = daysSinceMainshock;
  const t2 = daysSinceMainshock + forecastDays;
  const integral = omoriIntegral(t1, t2, p, c);

  // Normalize by total integral from 0 to ~365 days (approximate full sequence)
  const totalIntegral = omoriIntegral(0, 365, p, c);
  const fraction = integral / totalIntegral;

  return Math.max(0, totalExpected * fraction);
}

function omoriIntegral(t1, t2, p, c) {
  if (Math.abs(p - 1.0) < 0.001) {
    // p ≈ 1: integral is ln(c+t2) - ln(c+t1)
    return Math.log(c + t2) - Math.log(c + t1);
  }
  // General case
  const exp = 1 - p;
  return (Math.pow(c + t2, exp) - Math.pow(c + t1, exp)) / exp;
}

// Generate a full aftershock forecast for a mainshock
function generateForecast(mainshockMag, mainshockTime) {
  const now = Date.now();
  const daysSince = (now - mainshockTime) / (1000 * 60 * 60 * 24);

  // Bath's Law: largest expected aftershock
  const largestExpectedAftershock = mainshockMag - 1.2;

  // Forecast windows
  const windows = [
    { label: 'Next 24 hours', days: 1 },
    { label: 'Next 3 days', days: 3 },
    { label: 'Next 7 days', days: 7 },
    { label: 'Next 30 days', days: 30 },
  ];

  // Magnitude thresholds to forecast
  const thresholds = [
    { label: 'M3+', min: 3 },
    { label: 'M4+', min: 4 },
    { label: 'M5+', min: 5 },
  ];

  if (mainshockMag >= 6) {
    thresholds.push({ label: 'M6+', min: 6 });
  }

  const forecast = windows.map(w => {
    const predictions = thresholds
      .filter(t => t.min <= mainshockMag) // only forecast below mainshock magnitude
      .map(t => {
        const expected = estimateAftershocks(mainshockMag, daysSince, w.days, t.min);
        // Convert expected count to probability of at least one (Poisson)
        const probAtLeastOne = 1 - Math.exp(-expected);
        return {
          magnitudeThreshold: t.label,
          minMagnitude: t.min,
          expectedCount: Math.round(expected * 10) / 10,
          probability: Math.round(probAtLeastOne * 1000) / 10, // percentage with 1 decimal
        };
      });

    return {
      window: w.label,
      forecastDays: w.days,
      predictions,
    };
  });

  return {
    mainshock: {
      magnitude: mainshockMag,
      time: mainshockTime,
      timeISO: new Date(mainshockTime).toISOString(),
      daysSince: Math.round(daysSince * 10) / 10,
    },
    largestExpectedAftershock: Math.round(largestExpectedAftershock * 10) / 10,
    forecast,
    disclaimer: 'These estimates use simplified Bath, Omori, and Gutenberg-Richter models for educational purposes. Real aftershock forecasting involves complex statistical models and is performed by seismological agencies.',
  };
}

module.exports = { estimateAftershocks, generateForecast };
