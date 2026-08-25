import { useState, useEffect, useCallback, useRef } from 'react';
import { matchesAlertZone, sendQuakeNotification } from './useAlertZones';

// Connects to the backend SSE stream for real-time earthquake updates.
// Returns new quake events, live stats, connection status, and last update time.
// When alertZones are provided, triggers browser notifications for matching quakes.
export function useSSE(alertZones = []) {
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [liveStats, setLiveStats] = useState(null);
  const [liveCount, setLiveCount] = useState(0);
  const [newQuakes, setNewQuakes] = useState([]);
  const eventSourceRef = useRef(null);

  // Clear a notification after it's been shown
  const dismissQuake = useCallback((id) => {
    setNewQuakes(prev => prev.filter(q => q.id !== id));
  }, []);

  useEffect(() => {
    const es = new EventSource('/api/stream');
    eventSourceRef.current = es;

    es.onopen = () => setConnected(true);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'connected') {
          setConnected(true);
          setLastUpdate(data.timestamp);
        }

        if (data.type === 'heartbeat') {
          setLiveStats(data.stats);
          setLiveCount(data.count);
          setLastUpdate(data.timestamp);
        }

        if (data.type === 'new_quakes') {
          setNewQuakes(prev => [...data.quakes, ...prev].slice(0, 20));
          setLiveStats(data.stats);
          setLastUpdate(data.timestamp);

          // Play notification sound for M4+ quakes and check alert zones
          data.quakes.forEach(q => {
            if (q.magnitude >= 4) {
              playAlertSound(q.magnitude);
            }
            // Check if quake matches any user-defined alert zone
            const matched = matchesAlertZone(q, alertZones);
            matched.forEach(zone => sendQuakeNotification(q, zone));
          });
        }
      } catch (err) {
        console.error('SSE parse error:', err);
      }
    };

    es.onerror = () => {
      setConnected(false);
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, []);

  return { connected, lastUpdate, liveStats, liveCount, newQuakes, dismissQuake };
}

// Generate a short alert beep using the Web Audio API.
// Higher magnitude = lower pitch, longer duration for urgency.
function playAlertSound(magnitude) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    // Lower pitch for stronger quakes
    const freq = magnitude >= 6 ? 440 : magnitude >= 5 ? 660 : 880;
    oscillator.frequency.setValueAtTime(freq, ctx.currentTime);
    oscillator.type = 'sine';

    const duration = magnitude >= 6 ? 0.4 : 0.2;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);

    // Double beep for M6+
    if (magnitude >= 6) {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.setValueAtTime(freq, ctx.currentTime + 0.5);
      osc2.type = 'sine';
      gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.5);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5 + duration);
      osc2.start(ctx.currentTime + 0.5);
      osc2.stop(ctx.currentTime + 0.5 + duration);
    }
  } catch (e) {
    // Audio not available
  }
}
