import { useState, useEffect, useCallback } from 'react';

const API = 'https://seismi-q.onrender.com/api';

export function useLiveFeed(feed = 'all_day', refreshInterval = 60000) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(() => {
    fetch(`${API}/earthquakes/live?feed=${feed}`)
      .then(res => {
        if (!res.ok) throw new Error('Feed unavailable');
        return res.json();
      })
      .then(d => { setData(d); setError(null); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [feed]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  return { data, loading, error, refresh: fetchData };
}

export function useQuakeDetail(id) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`${API}/earthquakes/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  return { data, loading, error };
}

// Fetch historical earthquake data for a bounding box region
export function useHistoricalData(params) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(() => {
    if (!params) return;
    setLoading(true);
    const query = new URLSearchParams(params).toString();
    fetch(`${API}/earthquakes/historical/region?${query}`)
      .then(res => {
        if (!res.ok) throw new Error('Historical data unavailable');
        return res.json();
      })
      .then(d => { setData(d); setError(null); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [JSON.stringify(params)]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}

// Fetch region statistics for a clicked location
export function useRegionStats() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStats = useCallback((lat, lng, radius = 300, years = 20) => {
    setLoading(true);
    setError(null);
    const query = new URLSearchParams({ lat, lng, radius, years }).toString();
    fetch(`${API}/earthquakes/region/stats?${query}`)
      .then(res => {
        if (!res.ok) throw new Error('Stats unavailable');
        return res.json();
      })
      .then(d => { setData(d); setError(null); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const clear = useCallback(() => { setData(null); setError(null); }, []);

  return { data, loading, error, fetchStats, clear };
}

export function useAftershockForecast(id) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`${API}/earthquakes/${id}/aftershock-forecast`)
      .then(res => {
        if (!res.ok) throw new Error('Forecast unavailable');
        return res.json();
      })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  return { data, loading, error };
}
