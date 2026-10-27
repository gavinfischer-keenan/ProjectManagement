/* ═══════════════════════════════════════════════════════════════
   API Client — Hawaii Project Manager (100% Client-Side Mode)
   Uses IndexedDB + File System Access API for Local Persistence
   ═══════════════════════════════════════════════════════════════ */

import {
  dbFetchTasks,
  dbCreateTask,
  dbUpdateTask,
  dbDeleteTask,
  dbReorderTasks,
  dbFetchVendors,
  dbCreateVendor,
  dbUpdateVendor,
  dbDeleteVendor,
  dbAddVendorInteraction,
  dbUpdateVendorInteraction,
  dbDeleteVendorInteraction,
  dbFetchMaintenance,
  dbCreateMaintenance,
  dbUpdateMaintenance,
  dbDeleteMaintenance,
  dbFetchOwners,
  dbCreateOwner,
  dbUpdateOwner,
  dbDeleteOwner,
  dbImportAllData
} from '../storage/db.js';

import {
  openLocalProjectFile,
  saveToLocalProjectFile,
  saveAsLocalProjectFile,
  exportBackupDownload,
  importBackupFromFile,
  triggerAutoSave,
  subscribeFileStatus,
  getFileStatus
} from '../storage/fileSystem.js';

import { parseExcelTasks } from '../storage/excelImporter.js';

/* ── Tasks ──────────────────────────────────────────────────── */

export async function fetchTasks() {
  const tasks = await dbFetchTasks();
  return { tasks };
}

export async function createTask(task) {
  const created = await dbCreateTask(task);
  triggerAutoSave();
  return created;
}

export async function updateTask(id, updates) {
  const updated = await dbUpdateTask(id, updates);
  triggerAutoSave();
  return updated;
}

export async function deleteTask(id) {
  const res = await dbDeleteTask(id);
  triggerAutoSave();
  return res;
}

export async function reorderTasks(orderings) {
  const res = await dbReorderTasks(orderings);
  triggerAutoSave();
  return res;
}

/* ── Maintenance ────────────────────────────────────────────── */

export async function fetchMaintenance() {
  const maintenance = await dbFetchMaintenance();
  return { maintenance };
}

export async function createMaintenance(entry) {
  const created = await dbCreateMaintenance(entry);
  triggerAutoSave();
  return created;
}

export async function updateMaintenance(id, updates) {
  const updated = await dbUpdateMaintenance(id, updates);
  triggerAutoSave();
  return updated;
}

export async function deleteMaintenance(id) {
  const res = await dbDeleteMaintenance(id);
  triggerAutoSave();
  return res;
}

/* ── Vendors ─────────────────────────────────────────────────── */

export async function fetchVendors() {
  const vendors = await dbFetchVendors();
  return { vendors };
}

export async function createVendor(vendor) {
  const created = await dbCreateVendor(vendor);
  triggerAutoSave();
  return created;
}

export async function updateVendor(id, updates) {
  const updated = await dbUpdateVendor(id, updates);
  triggerAutoSave();
  return updated;
}

export async function deleteVendor(id) {
  const res = await dbDeleteVendor(id);
  triggerAutoSave();
  return res;
}

export async function addVendorInteraction(vendorId, interaction) {
  const created = await dbAddVendorInteraction(vendorId, interaction);
  triggerAutoSave();
  return created;
}

export async function updateVendorInteraction(vendorId, interactionId, updates) {
  const updated = await dbUpdateVendorInteraction(vendorId, interactionId, updates);
  triggerAutoSave();
  return updated;
}

export async function deleteVendorInteraction(vendorId, interactionId) {
  const res = await dbDeleteVendorInteraction(vendorId, interactionId);
  triggerAutoSave();
  return res;
}

/* ── Owners ──────────────────────────────────────────────────── */

export async function fetchOwners() {
  const owners = await dbFetchOwners();
  return { owners };
}

export async function createOwner(owner) {
  const created = await dbCreateOwner(owner);
  triggerAutoSave();
  return created;
}

export async function updateOwner(id, updates) {
  const updated = await dbUpdateOwner(id, updates);
  triggerAutoSave();
  return updated;
}

export async function deleteOwner(id) {
  const res = await dbDeleteOwner(id);
  triggerAutoSave();
  return res;
}

/* ── Excel Import ────────────────────────────────────────────── */

export async function importExcel(fileOrFormData) {
  let file = fileOrFormData;
  if (fileOrFormData instanceof FormData) {
    file = fileOrFormData.get('file');
  }

  if (!file) {
    throw new Error('No file provided for import');
  }

  const tasks = await parseExcelTasks(file);
  await dbImportAllData({ tasks });
  triggerAutoSave();

  return {
    success: true,
    count: tasks.length,
    message: `Successfully imported ${tasks.length} tasks`
  };
}

/* ── File Management & Storage Exports ────────────────────────── */

export {
  openLocalProjectFile,
  saveToLocalProjectFile,
  saveAsLocalProjectFile,
  exportBackupDownload,
  importBackupFromFile,
  subscribeFileStatus,
  getFileStatus
};
