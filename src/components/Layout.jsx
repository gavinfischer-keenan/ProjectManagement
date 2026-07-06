/* ═══════════════════════════════════════════════════════════════
   Layout — App Shell — Hawaii Project Manager
   ═══════════════════════════════════════════════════════════════ */

import React from 'react';
import ReportGenerator from './ReportGenerator.jsx';

const NAV_ITEMS = [
  { id: 'dashboard',   icon: '📊', label: 'Dashboard' },
  { id: 'tracker',     icon: '📋', label: 'Project Tracker' },
  { id: 'gantt',       icon: '📅', label: 'Gantt Timeline' },
  { id: 'daily',       icon: '🗓️', label: 'Daily Tasks' },
  { id: 'completed',   icon: '✅', label: 'Completed' },
  { id: 'maintenance', icon: '🔧', label: 'Maintenance Log' },
  { id: 'vendors',     icon: '📇', label: 'Vendors' },
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
  maintenance: 'Maintenance Log',
  vendors:     'Vendors',
  shopping:    'Shopping List',
  import:      'Import Data',
};

export default function Layout({ currentView, onNavigate, children, tasks, maintenanceEntries }) {
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
            {VIEW_TITLES[currentView] || 'Hawaii Project Manager'}
          </h1>
          {/* Report Generator lives here — visible on every screen */}
          <ReportGenerator tasks={tasks} maintenanceEntries={maintenanceEntries} />
        </header>

        <div className="content-area">
          {children}
        </div>
      </main>
    </div>
  );
}
