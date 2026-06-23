import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Activity, History as HistoryIcon, FileText, Settings as SettingsIcon, Wifi } from 'lucide-react';
import { socket } from './api';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

/**
 * Sidebar Navigation Component
 */
function Sidebar() {
  const location = useLocation();
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    function handleConnect() {
      setConnected(true);
    }
    function handleDisconnect() {
      setConnected(false);
    }

    // Set initial connection state
    setConnected(socket.connected);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, []);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: Activity },
    { name: 'History', path: '/history', icon: HistoryIcon },
    { name: 'Reports', path: '/reports', icon: FileText },
    { name: 'Settings', path: '/settings', icon: SettingsIcon }
  ];

  return (
    <div className="w-64 bg-dark-card border-r border-dark-border flex flex-col h-screen sticky top-0">
      {/* Brand logo & header */}
      <div className="p-6 border-b border-dark-border flex items-center gap-3">
        <div className="bg-brand-blue/10 p-2.5 rounded-xl text-brand-blue flex items-center justify-center">
          <Wifi className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-base leading-tight tracking-wider text-dark-text">NetProbe AI</h1>
          <span className="text-[10px] text-dark-muted font-bold tracking-widest uppercase block">Analyzer Engine</span>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-brand-blue/15 text-brand-blue border-l-2 border-brand-blue pl-3.5'
                  : 'text-dark-muted hover:text-dark-text hover:bg-dark-border/25'
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Socket Status Bottom Panel */}
      <div className="p-4 border-t border-dark-border bg-dark-bg/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-brand-green pulse-ring-green' : 'bg-brand-red pulse-ring-red'}`} />
            <span className="text-xs text-dark-muted font-semibold tracking-wide">
              {connected ? 'Live Scanner Online' : 'WebSocket Offline'}
            </span>
          </div>
          <span className="text-[10px] bg-dark-border px-2 py-0.5 rounded font-mono text-dark-muted font-bold">
            v1.0
          </span>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-dark-bg text-dark-text">
        <Sidebar />
        <main className="flex-1 p-8 overflow-y-auto max-h-screen">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/history" element={<History />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
