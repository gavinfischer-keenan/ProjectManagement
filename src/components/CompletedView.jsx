import React, { useMemo, useState } from 'react';
import { formatDate, durationDays } from '../utils/dateUtils.js';

export default function CompletedView({ tasks = [] }) {
  const [search, setSearch] = useState('');
  const [parentFilter, setParentFilter] = useState('all');
  const [sortKey, setSortKey] = useState('dateFinished');
  const [sortDir, setSortDir] = useState('desc');

  /* Only completed tasks */
  const completedTasks = useMemo(
    () => tasks.filter((t) => t.dateFinished || t.status === 'Completed'),
    [tasks]
  );

  /* Derive parent name lookup */
  const parentNameMap = useMemo(() => {
    const map = {};
    for (const t of tasks) {
      if (t.parentId) {
        const parent = tasks.find((p) => p.id === t.parentId);
        if (parent) map[t.id] = parent.name;
      }
    }
    return map;
  }, [tasks]);

  /* Unique parent names for the filter dropdown */
  const parentNames = useMemo(() => {
    const names = new Set(Object.values(parentNameMap));
    return Array.from(names).sort();
  }, [parentNameMap]);

  /* Filter + sort */
  const displayTasks = useMemo(() => {
    let list = [...completedTasks];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          (t.name && t.name.toLowerCase().includes(q)) ||
          (t.notes && t.notes.toLowerCase().includes(q))
      );
    }

    // Parent filter
    if (parentFilter !== 'all') {
      list = list.filter((t) => parentNameMap[t.id] === parentFilter);
    }

    // Sort
    list.sort((a, b) => {
      let va, vb;
      if (sortKey === 'name') {
        va = (a.name || '').toLowerCase();
        vb = (b.name || '').toLowerCase();
      } else if (sortKey === 'dateFinished') {
        va = a.dateFinished || '';
        vb = b.dateFinished || '';
      } else if (sortKey === 'parent') {
        va = (parentNameMap[a.id] || '').toLowerCase();
        vb = (parentNameMap[b.id] || '').toLowerCase();
      } else {
        va = '';
        vb = '';
      }

      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [completedTasks, search, parentFilter, sortKey, sortDir, parentNameMap]);

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function SortHeader({ label, field }) {
    const active = sortKey === field;
    const arrow = active ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';
    return (
      <button
        className={`sort-btn ${active ? 'sort-btn--active' : ''}`}
        onClick={() => toggleSort(field)}
      >
        {label}{arrow}
      </button>
    );
  }

  return (
    <div>
      <h2 className="section-title">✅ Completed Tasks</h2>
      <p className="completed-count">
        <strong>{displayTasks.length}</strong> completed task{displayTasks.length !== 1 ? 's' : ''}
      </p>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="form-input"
            placeholder="Search by name or notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="form-select"
          value={parentFilter}
          onChange={(e) => setParentFilter(e.target.value)}
        >
          <option value="all">All Categories</option>
          {parentNames.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {displayTasks.length === 0 ? (
        <div className="empty-state glass-panel fade-in-up">
          <div className="empty-state__icon">📭</div>
          <div className="empty-state__text">No completed tasks found</div>
          <div className="empty-state__subtext">Adjust your filters or start completing tasks!</div>
        </div>
      ) : (
        <div className="glass-panel" style={{ overflow: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th><SortHeader label="Task Name" field="name" /></th>
                <th><SortHeader label="Parent" field="parent" /></th>
                <th>Date Started</th>
                <th><SortHeader label="Date Finished" field="dateFinished" /></th>
                <th>Duration</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {displayTasks.map((t) => {
                const dur = durationDays(t);
                return (
                  <tr key={t.id} className="row--completed">
                    <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                      {t.name}
                    </td>
                    <td>{parentNameMap[t.id] || '—'}</td>
                    <td>{formatDate(t.dateStarted)}</td>
                    <td>{formatDate(t.dateFinished)}</td>
                    <td>{dur != null ? `${dur} day${dur !== 1 ? 's' : ''}` : '—'}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.notes || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
