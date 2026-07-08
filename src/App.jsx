/* ═══════════════════════════════════════════════════════════════
   App — Root Component — Hawaii Project Manager
   ═══════════════════════════════════════════════════════════════ */

import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout.jsx';
import TaskTable from './components/TaskTable.jsx';
import SummaryDashboard from './components/SummaryDashboard.jsx';
import DailyTaskList from './components/DailyTaskList.jsx';
import CompletedView from './components/CompletedView.jsx';
import MaintenanceLog from './components/MaintenanceLog.jsx';
import ImportWizard from './components/ImportWizard.jsx';
import GanttTimeline from './components/GanttTimeline.jsx';
import VendorPanel from './components/VendorPanel.jsx';
import ShoppingList from './components/ShoppingList.jsx';
import {
  fetchTasks, fetchMaintenance,
  updateTask, deleteTask, createTask,
  createMaintenance, updateMaintenance, deleteMaintenance,
  fetchVendors, createVendor,
} from './api/client.js';

const VIEWS = {
  dashboard:    'dashboard',
  tracker:      'tracker',
  gantt:        'gantt',
  daily:        'daily',
  completed:    'completed',
  maintenance:  'maintenance',
  vendors:      'vendors',
  shopping:     'shopping',
  import:       'import',
};

export default function App() {
  const [currentView, setCurrentView] = useState(VIEWS.tracker);
  const [tasks, setTasks] = useState([]);
  const [maintenanceEntries, setMaintenanceEntries] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  /* Dashboard Navigation State */
  const [focusedSectionId, setFocusedSectionId] = useState(null);
  const [focusedTaskId, setFocusedTaskId] = useState(null);
  /* Vendor-triggered task creation defaults */
  const [vendorTaskDefaults, setVendorTaskDefaults] = useState(null);

  /* ── Data Loading ───────────────────────────────────────── */
  const refreshTasks = useCallback(async () => {
    try {
      const data = await fetchTasks();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
  }, []);

  const refreshMaintenance = useCallback(async () => {
    try {
      const data = await fetchMaintenance();
      setMaintenanceEntries(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch maintenance:', err);
    }
  }, []);

  const refreshVendors = useCallback(async () => {
    try {
      const data = await fetchVendors();
      setVendors(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch vendors:', err);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([refreshTasks(), refreshMaintenance(), refreshVendors()]);
      setLoading(false);
    };
    load();
  }, [refreshTasks, refreshMaintenance, refreshVendors]);

  /* ── Task Handlers ──────────────────────────────────────── */
  const handleTaskUpdate = useCallback(async (id, updates) => {
    try {
      const updated = await updateTask(id, updates);
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)));
      refreshTasks(); // fetch full tree to show lock-step date cascading
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  }, [refreshTasks]);

  /* Callback used by DailyTaskList where the updated task object is passed directly */
  const handleDailyTaskUpdate = useCallback((updatedTask) => {
    if (updatedTask && updatedTask.id) {
      setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t)));
    }
  }, []);

  const handleTaskDelete = useCallback(async (id) => {
    try {
      await deleteTask(id);
      refreshTasks(); // fetch full tree to remove cascaded deletions
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  }, [refreshTasks]);

  const handleTaskCreate = useCallback(async (task) => {
    try {
      const created = await createTask(task);
      setTasks((prev) => [...prev, created]);
      return created; // Return so callers (e.g. prerequisite flow) can use the new ID
    } catch (err) {
      console.error('Failed to create task:', err);
      return null;
    }
  }, []);

  const handleVendorCreate = useCallback(async (stub) => {
    try {
      const created = await createVendor(stub);
      setVendors(prev => [...prev, created]);
      return created;
    } catch (err) {
      console.error('Failed to create vendor stub:', err);
      return null;
    }
  }, []);

  /* ── Maintenance CRUD ──────────────────────────────────── */
  const handleMaintenanceAdd = useCallback(async (entry) => {
    const created = await createMaintenance(entry);
    setMaintenanceEntries((prev) => [...prev, created]);
  }, []);

  const handleMaintenanceUpdate = useCallback(async (id, updates) => {
    const updated = await updateMaintenance(id, updates);
    setMaintenanceEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updated } : e))
    );
  }, []);

  const handleMaintenanceDelete = useCallback(async (id) => {
    await deleteMaintenance(id);
    setMaintenanceEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  /* ── Import Complete ───────────────────────────────────── */
  const handleImportComplete = useCallback(async () => {
    await refreshTasks();
  }, [refreshTasks]);

  /* ── View Rendering ─────────────────────────────────────── */
  const renderContent = () => {
    if (loading) {
      return (
        <div className="empty-state">
          <div className="spinner" />
          <p className="empty-state__text">Loading project data…</p>
        </div>
      );
    }

    switch (currentView) {
      case VIEWS.tracker:
        return (
          <TaskTable
            tasks={tasks}
            vendors={vendors}
            maintenanceEntries={maintenanceEntries}
            onTaskUpdate={handleTaskUpdate}
            onTaskDelete={handleTaskDelete}
            onTaskCreate={handleTaskCreate}
            onTasksRefresh={refreshTasks}
            onVendorCreate={handleVendorCreate}
            focusedSectionId={focusedSectionId}
            focusedTaskId={focusedTaskId}
            vendorTaskDefaults={vendorTaskDefaults}
            onClearFocus={() => { setFocusedSectionId(null); setFocusedTaskId(null); setVendorTaskDefaults(null); }}
          />
        );

      case VIEWS.dashboard:
        return (
          <SummaryDashboard 
            tasks={tasks} 
            maintenanceEntries={maintenanceEntries} 
            onFocusSection={(id) => {
              setFocusedSectionId(id);
              setCurrentView(VIEWS.tracker);
            }}
            onFocusTask={(id) => {
              setFocusedTaskId(id);
              setCurrentView(VIEWS.tracker);
            }}
          />
        );

      case VIEWS.daily:
        return (
          <DailyTaskList
            tasks={tasks}
            onTaskUpdate={handleDailyTaskUpdate}
          />
        );

      case VIEWS.completed:
        return <CompletedView tasks={tasks} />;

      case VIEWS.gantt:
        return (
          <div className="gantt-full-view">
            <GanttTimeline 
              tasks={tasks} 
              fullPage 
              onFocusTask={(id) => {
                setFocusedTaskId(id);
                setCurrentView(VIEWS.tracker);
              }}
            />
          </div>
        );

      case VIEWS.maintenance:
        return (
          <MaintenanceLog
            entries={maintenanceEntries}
            onAdd={handleMaintenanceAdd}
            onUpdate={handleMaintenanceUpdate}
            onDelete={handleMaintenanceDelete}
            tasks={tasks}
          />
        );

      case VIEWS.import:
        return <ImportWizard onImportComplete={handleImportComplete} />;

      case VIEWS.vendors:
        return (
          <VendorPanel
            vendors={vendors}
            onVendorsChange={setVendors}
            tasks={tasks}
            onCreateTask={(defaults) => {
              setVendorTaskDefaults(defaults);
              setCurrentView(VIEWS.tracker);
            }}
          />
        );

      case VIEWS.shopping:
        return (
          <ShoppingList
            tasks={tasks}
            onTaskUpdate={handleTaskUpdate}
            onTasksRefresh={refreshTasks}
          />
        );

      default:
        return null;
    }
  };

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <Layout currentView={currentView} onNavigate={setCurrentView} tasks={tasks} maintenanceEntries={maintenanceEntries}>
      {renderContent()}
    </Layout>
  );
}
