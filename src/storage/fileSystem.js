/**
 * File System Access API & Local File Management for Hawaii PM
 * Enables opening and saving real project files on the user's hard drive!
 */

import { dbExportAllData, dbImportAllData } from './db.js';

let activeFileHandle = null;
let activeFileName = null;
let autoSaveTimeout = null;
let saveError = null;

const listeners = new Set();

function notifyStatus() {
  const status = {
    saveError,
    hasActiveFile: Boolean(activeFileHandle),
    fileName: activeFileName || 'Browser Storage (IndexedDB)',
    supportsFSA: typeof window !== 'undefined' && 'showOpenFilePicker' in window
  };
  listeners.forEach(fn => fn(status));
}

export function subscribeFileStatus(fn) {
  listeners.add(fn);
  notifyStatus();
  return () => listeners.delete(fn);
}

export function getFileStatus() {
  return {
    saveError,
    hasActiveFile: Boolean(activeFileHandle),
    fileName: activeFileName || 'Browser Storage (IndexedDB)',
    supportsFSA: typeof window !== 'undefined' && 'showOpenFilePicker' in window
  };
}

/**
 * Open a .json project file from the local hard drive
 */
export async function openLocalProjectFile() {
  if (!('showOpenFilePicker' in window)) {
    throw new Error('File System Access API is not supported in this browser. Please use Chrome or Edge, or use Import Backup.');
  }

  const [handle] = await window.showOpenFilePicker({
    types: [{
      description: 'Hawaii PM Project JSON (*.json)',
      accept: { 'application/json': ['.json'] }
    }],
    multiple: false
  });

  const file = await handle.getFile();
  const text = await file.text();
  const data = JSON.parse(text);

  await dbImportAllData(data);

  activeFileHandle = handle;
  activeFileName = file.name;
  notifyStatus();

  return { fileName: file.name, data };
}

/**
 * Save current state directly to the currently linked local file
 */
export async function saveToLocalProjectFile() {
  if (!activeFileHandle) {
    return saveAsLocalProjectFile();
  }

  const data = await dbExportAllData();
  const writable = await activeFileHandle.createWritable();
  await writable.write(JSON.stringify(data, null, 2));
  await writable.close();
  notifyStatus();
  return activeFileName;
}

/**
 * Prompt user with Windows Save dialog to choose where to save
 */
export async function saveAsLocalProjectFile() {
  if (!('showSaveFilePicker' in window)) {
    // Fallback to direct download
    return exportBackupDownload();
  }

  const handle = await window.showSaveFilePicker({
    suggestedName: activeFileName || 'Hawaii_Project_Plan.json',
    types: [{
      description: 'Hawaii PM Project JSON (*.json)',
      accept: { 'application/json': ['.json'] }
    }]
  });

  const data = await dbExportAllData();
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(data, null, 2));
  await writable.close();

  activeFileHandle = handle;
  activeFileName = handle.name;
  notifyStatus();

  return handle.name;
}

/**
 * Auto-save to linked local file with 600ms debounce
 */
export function triggerAutoSave() {
  if (!activeFileHandle) return;

  if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
  autoSaveTimeout = setTimeout(async () => {
    try {
      const data = await dbExportAllData();
      const writable = await activeFileHandle.createWritable();
      await writable.write(JSON.stringify(data, null, 2));
      await writable.close();
      saveError = null; notifyStatus();
      console.log(`[AutoSave] Saved to local file: ${activeFileName}`);
    } catch (err) {
      saveError = 'Local file save failed. Changes remain in browser storage; export a backup.'; notifyStatus();
      console.warn('[AutoSave] Could not auto-save to file handle:', err);
    }
  }, 600);
}

/**
 * Fallback browser download (works in any browser)
 */
export async function exportBackupDownload() {
  const data = await dbExportAllData();
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const dateStr = new Date().toISOString().split('T')[0];
  const a = document.createElement('a');
  a.href = url;
  a.download = `hawaii-pm-backup-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return a.download;
}

/**
 * Restore from a selected JSON backup file
 */
export async function importBackupFromFile(file) {
  const text = await file.text();
  const data = JSON.parse(text);
  await dbImportAllData(data);
  return data;
}
