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
import MaintenancePrompt from './components/MaintenancePrompt.jsx';
import ImportWizard from './components/ImportWizard.jsx';
import ExportButton from './components/ExportButton.jsx';
import {
  fetchTasks, fetchMaintenance,
  updateTask, deleteTask, createTask,
  createMaintenance, updateMaintenance, deleteMaintenance,
} from './api/client.js';

const VIEWS = {
  dashboard:    'dashboard',
  tracker:      'tracker',
  daily:        'daily',
  completed:    'completed',
  maintenance:  'maintenance',
  import:       'import',
};

export default function App() {
  const [currentView, setCurrentView] = useState(VIEWS.tracker);
  const [tasks, setTasks] = useState([]);
  const [maintenanceEntries, setMaintenanceEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ── Maintenance Prompt Modal State ─────────────────────── */
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptTask, setPromptTask] = useState(null);

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

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([refreshTasks(), refreshMaintenance()]);
      setLoading(false);
    };
    load();
  }, [refreshTasks, refreshMaintenance]);

  /* ── Task Handlers ──────────────────────────────────────── */
  const handleTaskUpdate = useCallback(async (id, updates) => {
    try {
      const updated = await updateTask(id, updates);
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)));
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  }, []);

  /* Callback used by DailyTaskList where the updated task object is passed directly */
  const handleDailyTaskUpdate = useCallback((updatedTask) => {
    if (updatedTask && updatedTask.id) {
      setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t)));
    }
  }, []);

  const handleTaskDelete = useCallback(async (id) => {
    try {
      await deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  }, []);

  const handleTaskCreate = useCallback(async (task) => {
    try {
      const created = await createTask(task);
      setTasks((prev) => [...prev, created]);
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  }, []);

  /* ── Maintenance Prompt ────────────────────────────────── */
  const handleShowMaintenancePrompt = useCallback((task) => {
    setPromptTask(task);
    setPromptOpen(true);
  }, []);

  const handleMaintenanceSubmit = useCallback(async (entry) => {
    try {
      const created = await createMaintenance(entry);
      setMaintenanceEntries((prev) => [...prev, created]);
    } catch (err) {
      console.error('Failed to add maintenance entry:', err);
    }
    setPromptOpen(false);
    setPromptTask(null);
  }, []);

  const handleMaintenanceSkip = useCallback(() => {
    setPromptOpen(false);
    setPromptTask(null);
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
            onTaskUpdate={handleTaskUpdate}
            onTaskDelete={handleTaskDelete}
            onTaskCreate={handleTaskCreate}
            onShowMaintenancePrompt={handleShowMaintenancePrompt}
          />
        );

      case VIEWS.dashboard:
        return (
          <SummaryDashboard
            tasks={tasks}
            maintenanceEntries={maintenanceEntries}
          />
        );

      case VIEWS.daily:
        return (
          <DailyTaskList
            tasks={tasks}
            onTaskUpdate={handleDailyTaskUpdate}
            onShowMaintenancePrompt={handleShowMaintenancePrompt}
          />
        );

      case VIEWS.completed:
        return <CompletedView tasks={tasks} />;

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

      default:
        return null;
    }
  };

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <Layout currentView={currentView} onNavigate={setCurrentView}>
      {renderContent()}

      {/* Global: Export Button (always visible in header area) */}
      <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 900 }}>
        <ExportButton tasks={tasks} maintenanceEntries={maintenanceEntries} />
      </div>

      {/* Global: Maintenance Prompt Modal */}
      <MaintenancePrompt
        isOpen={promptOpen}
        task={promptTask}
        onSubmit={handleMaintenanceSubmit}
        onSkip={handleMaintenanceSkip}
      />
    </Layout>
  );
}
