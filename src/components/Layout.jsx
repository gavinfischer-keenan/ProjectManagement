/* ═══════════════════════════════════════════════════════════════
   Layout — App Shell — Project management software
   ═══════════════════════════════════════════════════════════════ */

import React, { useState, useEffect } from 'react';
import ReportGenerator from './ReportGenerator.jsx';
import LocalFileManager from './LocalFileManager.jsx';

const NAV_ITEMS = [
  { id: 'dashboard',   icon: '📊', label: 'Dashboard' },
  { id: 'tracker',     icon: '📋', label: 'Project Tracker' },
  { id: 'gantt',       icon: '📅', label: 'Gantt Timeline' },
  { id: 'daily',       icon: '🗓️', label: 'Daily Tasks' },
  { id: 'completed',   icon: '✅', label: 'Completed' },
  { id: 'maintenance', icon: '📋', label: 'Event Log' },
  { id: 'vendors',     icon: '📇', label: 'Vendors' },
  { id: 'owners',      icon: '👤', label: 'Owners' },
  { id: 'shopping',    icon: '🛒', label: 'Shopping List' },
];

const NAV_BOTTOM = [
  { id: 'import', icon: '📥', label: 'Import Data' },
];

const VIEW_TITLES = {
  dashboard:   'Dashboard',
  tracker:     'Project Tracker',
  gantt:       'Gantt Timeline',
  daily:       'Daily Tasks',
  completed:   'Completed Tasks',
  maintenance: 'Event Log',
  vendors:     'Vendors',
  owners:      'Owners',
  shopping:    'Shopping List',
  import:      'Import Data',
};

export default function Layout({ currentView, onNavigate, children, tasks, maintenanceEntries, lastSynced, onDataReload }) {
  const [syncLabel, setSyncLabel] = useState('');

  useEffect(() => {
    if (!lastSynced) return;
    const update = () => {
      const secs = Math.floor((Date.now() - lastSynced) / 1000);
      if (secs < 5)  setSyncLabel('just now');
      else if (secs < 60) setSyncLabel(`${secs}s ago`);
      else setSyncLabel(`${Math.floor(secs/60)}m ago`);
    };
    update();
    const id = setInterval(update, 5000);
    return () => clearInterval(id);
  }, [lastSynced]);

  return (
    <div className="app-layout">
      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <img src={`${import.meta.env.BASE_URL}brand/bigfin-squid-logo.jpg`} alt="" style={{width:48,height:48,objectFit:"contain",borderRadius:8}} />
          <span className="sidebar-title">Bigfin Squid<small style={{display:"block",fontSize:11}}>Project management software</small></span>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${currentView === item.id ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
              title={item.label}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
          <div className="sidebar-nav-spacer" />
          {NAV_BOTTOM.map((item) => (
            <button
              key={item.id}
              className={`nav-item nav-item-bottom ${currentView === item.id ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
              title={item.label}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Main Area ───────────────────────────────────── */}
      <main className="main-content">
        <header className="main-header">
          <h1 className="main-header-title">
            {VIEW_TITLES[currentView] || 'Project management software'}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Local File & Storage Manager */}
            <LocalFileManager onDataReload={onDataReload} />

            {lastSynced && (
              <span className="sync-indicator" title={`Last refreshed from local browser storage: ${syncLabel}`}>
                <span className="sync-dot" />
                Local · {syncLabel}
              </span>
            )}

            {/* Report Generator */}
            <ReportGenerator tasks={tasks} maintenanceEntries={maintenanceEntries} />
          </div>
        </header>

        <div style={{padding:"8px 24px",fontSize:12}}>Project data stays in this browser. Export JSON backups regularly; clearing browser storage removes local records. <a href="/">TripoFisch</a></div>
        <div className="content-area">
          {children}
        </div>
      </main>
    </div>
  );
}
