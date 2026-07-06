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
import {
  fetchTasks, fetchMaintenance,
  updateTask, deleteTask, createTask,
  createMaintenance, updateMaintenance, deleteMaintenance,
} from './api/client.js';

const VIEWS = {
  dashboard:    'dashboard',
  tracker:      'tracker',
  gantt:        'gantt',
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

  /* ── Milestone Complete ─────────────────────────────────── */
  const handleMilestoneComplete = useCallback(async (task, milestoneText, allTasks) => {
    // Walk up parent chain to find the top-level section name
    const getSectionName = (t, tList) => {
      if (!t) return '';
      if (!t.parentId) return t.name; // it IS the section
      const parent = tList.find(p => p.id === t.parentId);
      return getSectionName(parent, tList);
    };
    const sectionName = getSectionName(task, allTasks);
    const sectionTask = allTasks.find(t => !t.parentId && t.name === sectionName);

    const todayISO = (() => {
      const n = new Date();
      return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
    })();

    try {
      const created = await createMaintenance({
        description: milestoneText || `Milestone: ${task.name}`,
        isMilestone: true,
        milestoneText: milestoneText || task.name,
        sectionName: sectionName || '',
        sectionId: sectionTask?.id || null,
        taskId: task.id,
        dateOfRepair: todayISO,
        dateWhenFixed: todayISO,
        notes: `Auto-logged when task "${task.name}" was marked complete.`,
      });
      setMaintenanceEntries(prev => [...prev, created]);
    } catch (err) {
      console.error('Failed to log milestone:', err);
    }
  }, []);

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
            maintenanceEntries={maintenanceEntries}
            onTaskUpdate={handleTaskUpdate}
            onTaskDelete={handleTaskDelete}
            onTaskCreate={handleTaskCreate}
            onTasksRefresh={refreshTasks}
            onMilestoneComplete={handleMilestoneComplete}
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
          />
        );

      case VIEWS.completed:
        return <CompletedView tasks={tasks} />;

      case VIEWS.gantt:
        return (
          <div className="gantt-full-view">
            <GanttTimeline tasks={tasks} fullPage />
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
