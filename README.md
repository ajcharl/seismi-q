# Real-Time Earthquake Monitor & Aftershock Forecaster

Live earthquake monitoring dashboard with aftershock probability estimation, powered by USGS real-time seismic data.

## Features

- **Live seismic feed** — Real-time earthquake data auto-refreshing every 60 seconds
- **Interactive map** — Dark-themed Leaflet map with magnitude-scaled markers
- **Feed filters** — Past hour, 24h, 7 days, M4.5+ today, significant month
- **Event details** — Depth, intensity, felt reports, tsunami status, USGS alert level
- **Aftershock forecasting** — Probability estimates using Bath's Law, Omori's Law, and Gutenberg-Richter relation
- **Alert zones** — Define custom monitoring regions with magnitude thresholds
- **No API key required** — USGS data is completely free and open

## Tech Stack

- **Frontend:** React, React Router, Leaflet, Recharts
- **Backend:** Node.js, Express
- **Data source:** USGS Earthquake Hazards Program (FDSN API + GeoJSON feeds)
- **Models:** Bath's Law, Omori-Utsu decay, Gutenberg-Richter frequency-magnitude

## Getting Started

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

- `GET /api/earthquakes/live?feed=all_day` — Real-time feed (all_hour, all_day, all_week, m45_day, significant_month)
- `GET /api/earthquakes/search?starttime=...&endtime=...&minmagnitude=...` — Custom search
- `GET /api/earthquakes/:id` — Event detail
- `GET /api/earthquakes/:id/aftershock-forecast` — Aftershock probability estimates (M4.0+)
- `GET /api/earthquakes/nearby/search?lat=...&lng=...&radius=100` — Nearby historical activity
- `POST /api/alerts/zones` — Create monitoring zone
- `GET /api/alerts/check` — Check zones against recent activity

## Aftershock Model

The aftershock forecasting uses three established seismological relationships:

- **Bath's Law:** Largest aftershock is typically ~1.2 magnitudes below the mainshock
- **Omori's Law:** Aftershock rate decays as n(t) = K / (c + t)^p
- **Gutenberg-Richter:** log₁₀(N) = a - bM relates frequency to magnitude


