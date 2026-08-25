import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import QuakeDetail from './pages/QuakeDetail';
import RiskMap from './pages/RiskMap';
import Alerts from './pages/Alerts';
import ToastNotifications from './components/ToastNotifications';
import { useSSE } from './hooks/useSSE';
import { useAlertZones } from './hooks/useAlertZones';

const navLinkStyle = (isActive) => ({
  padding: '6px 14px',
  fontSize: '0.7rem',
  fontFamily: 'var(--font-mono)',
  color: isActive ? '#fff' : 'var(--text-muted)',
  textDecoration: 'none',
  background: isActive ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
  borderRadius: '8px',
  border: isActive ? '1px solid var(--border)' : '1px solid transparent',
  transition: 'all 0.2s ease',
  letterSpacing: '0.04em',
  fontWeight: isActive ? 500 : 400,
});

function formatTimeAgo(timestamp) {
  if (!timestamp) return '';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

function AppContent() {
  const { zones, addZone, removeZone, toggleZone } = useAlertZones();
  const { connected, lastUpdate, liveCount, newQuakes, dismissQuake } = useSSE(zones);

  return (
    <div style={{ minHeight: '100vh' }}>
      <header style={{
        padding: '0 24px',
        height: '52px',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(9, 9, 11, 0.85)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: connected ? 'var(--seismic-red)' : 'var(--text-muted)',
            boxShadow: connected ? '0 0 8px var(--seismic-red)' : 'none',
            animation: connected ? 'pulse 2s infinite' : 'none',
          }} />
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            fontSize: '0.9rem',
            color: 'var(--text-primary)',
            letterSpacing: '0.1em',
          }}>
            SEISMIQ
          </span>
        </div>

        {/* Status pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {liveCount > 0 && (
            <span style={{
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '0.6rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 500,
              background: 'rgba(255, 255, 255, 0.04)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}>
              {liveCount}/hr
            </span>
          )}

          {lastUpdate && (
            <span style={{
              fontSize: '0.58rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
            }}>
              {formatTimeAgo(lastUpdate)}
            </span>
          )}
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', gap: '2px', marginLeft: 'auto' }}>
          <NavLink to="/" end style={({ isActive }) => navLinkStyle(isActive)}>
            Live Feed
          </NavLink>
          <NavLink to="/risk-map" style={({ isActive }) => navLinkStyle(isActive)}>
            Risk Map
          </NavLink>
          <NavLink to="/alerts" style={({ isActive }) => navLinkStyle(isActive)}>
            Alerts{zones.length > 0 ? ` (${zones.filter(z => z.enabled).length})` : ''}
          </NavLink>
        </nav>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 20px' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/risk-map" element={<RiskMap />} />
          <Route path="/alerts" element={
            <Alerts zones={zones} onAdd={addZone} onRemove={removeZone} onToggle={toggleZone} />
          } />
          <Route path="/quake/:id" element={<QuakeDetail />} />
        </Routes>
      </main>

      <ToastNotifications quakes={newQuakes} onDismiss={dismissQuake} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </BrowserRouter>
  );
}
