/* ═══════════════════════════════════════════════════════════════
   Layout — App Shell — Hawaii Project Manager
   ═══════════════════════════════════════════════════════════════ */

import React from 'react';

const NAV_ITEMS = [
  { id: 'dashboard',   icon: '📊', label: 'Dashboard' },
  { id: 'tracker',     icon: '📋', label: 'Project Tracker' },
  { id: 'daily',       icon: '📅', label: 'Daily Tasks' },
  { id: 'completed',   icon: '✅', label: 'Completed' },
  { id: 'maintenance', icon: '🔧', label: 'Maintenance Log' },
  { id: 'import',      icon: '📥', label: 'Import Data' },
];

const VIEW_TITLES = {
  dashboard:   'Dashboard',
  tracker:     'Project Tracker',
  daily:       'Daily Tasks',
  completed:   'Completed Tasks',
  maintenance: 'Maintenance Log',
  import:      'Import Data',
};

export default function Layout({ currentView, onNavigate, children }) {
  return (
    <div className="app-layout">
      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="sidebar-logo">🏠</span>
          <span className="sidebar-title">Hawaii PM</span>
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
        </nav>
      </aside>

      {/* ── Main Area ───────────────────────────────────── */}
      <main className="main-content">
        <header className="main-header">
          <h1 className="main-header-title">
            {VIEW_TITLES[currentView] || 'Hawaii Project Manager'}
          </h1>
        </header>

        <div className="content-area">
          {children}
        </div>
      </main>
    </div>
  );
}
