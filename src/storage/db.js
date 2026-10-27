/**
 * IndexedDB Database for Hawaii PM (100% Client-Side Persistence)
 */

import { seedTasks, seedVendors, seedMaintenance, seedOwners } from './seedData.js';
import { cascadeTaskDates, getDeltaDays } from './dateCascader.js';

const DB_NAME = 'HawaiiPM_Database';
const DB_VERSION = 1;

let dbInstance = null;
let opening = null;

export async function getDB() {
  if (dbInstance) return dbInstance;

  if (opening) return opening;
  opening = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('tasks')) {
        db.createObjectStore('tasks', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('vendors')) {
        db.createObjectStore('vendors', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('maintenance')) {
        db.createObjectStore('maintenance', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('owners')) {
        db.createObjectStore('owners', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };

    request.onsuccess = async (event) => {
      dbInstance = event.target.result;
      try { await ensureSeedData(dbInstance); resolve(dbInstance); }
      catch(error) { dbInstance = null; opening = null; reject(error); }
    };

    request.onerror = (event) => {
      opening = null;
      console.error('IndexedDB open error:', event.target.error);
      reject(event.target.error);
    };
  });
  return opening;
}

/**
 * Seed initial data if the database is newly created
 */
async function ensureSeedData(db) {
  const tasks = await getAllFromStore(db, 'tasks');
  if (tasks.length === 0 && seedTasks.length > 0) {
    console.log('Seeding initial tasks, vendors, and owners into local IndexedDB...');
    const tx = db.transaction(['tasks', 'vendors', 'maintenance', 'owners'], 'readwrite');
    const taskStore = tx.objectStore('tasks');
    seedTasks.forEach(t => taskStore.put(t));

    const vendorStore = tx.objectStore('vendors');
    seedVendors.forEach(v => vendorStore.put(v));

    const maintStore = tx.objectStore('maintenance');
    seedMaintenance.forEach(m => maintStore.put(m));

    const ownerStore = tx.objectStore('owners');
    seedOwners.forEach(o => ownerStore.put(o));

    await new Promise((res) => { tx.oncomplete = res; });
  }
}

function getAllFromStore(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function putInStore(db, storeName, item) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(item);
    tx.oncomplete = () => resolve(item);
    tx.onabort = () => reject(tx.error || new Error("Save aborted"));
    req.onerror = () => reject(req.error);
  });
}

function deleteFromStore(db, storeName, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(id);
    tx.oncomplete = () => resolve(true);
    tx.onabort = () => reject(tx.error || new Error("Delete aborted"));
    req.onerror = () => reject(req.error);
  });
}

// ---------------------------------------------------------------------------
// Tasks API
// ---------------------------------------------------------------------------

export async function dbFetchTasks() {
  const db = await getDB();
  const tasks = await getAllFromStore(db, 'tasks');
  // Sort by order ascending
  return tasks.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export async function dbCreateTask(taskData) {
  const db = await getDB();
  const id = taskData.id || crypto.randomUUID();
  const now = new Date().toISOString();

  const newTask = {
    id,
    parentId: taskData.parentId ?? null,
    order: taskData.order ?? 0,
    name: (taskData.name || '').trim(),
    taskType: taskData.taskType ?? 'task',
    dependency: taskData.dependency ?? '',
    dependsOnTaskId: taskData.dependsOnTaskId ?? null,
    notes: taskData.notes ?? '',
    targetDateStart: taskData.targetDateStart ?? null,
    targetDateFinish: taskData.targetDateFinish ?? null,
    dateStarted: taskData.dateStarted ?? null,
    dateFinished: taskData.dateFinished ?? null,
    duration: taskData.duration ?? 0,
    status: taskData.status ?? 'Not Started',
    delayed: Boolean(taskData.delayed),
    percentComplete: taskData.percentComplete ?? 0,
    isMilestone: Boolean(taskData.isMilestone),
    milestoneText: taskData.milestoneText ?? '',
    isHardware: Boolean(taskData.isHardware),
    hardwareText: taskData.hardwareText ?? '',
    vendorId: taskData.vendorId ?? null,
    ownerId: taskData.ownerId ?? null,
    supplies: Array.isArray(taskData.supplies) ? taskData.supplies : [],
    createdAt: now
  };

  await putInStore(db, 'tasks', newTask);
  return newTask;
}

export async function dbUpdateTask(id, updates) {
  const db = await getDB();
  const tasks = await getAllFromStore(db, 'tasks');
  const taskMap = {};
  tasks.forEach(t => { taskMap[t.id] = { ...t }; });

  const existing = taskMap[id];
  if (!existing) {
    throw new Error(`Task ${id} not found`);
  }

  // Calculate deltaDays for date cascading if target dates changed
  const oldStart = existing.targetDateStart;
  const newStart = updates.targetDateStart !== undefined ? updates.targetDateStart : oldStart;
  let deltaDays = 0;
  if (updates.targetDateStart && updates.targetDateStart !== oldStart) {
    deltaDays = getDeltaDays(oldStart, newStart);
  }

  // Apply updates
  Object.assign(existing, updates);

  // If start changed and there's a duration, adjust finish
  if (updates.targetDateStart && existing.duration && !updates.targetDateFinish) {
    // Keep finish in lock-step
    const d = new Date(existing.targetDateStart);
    d.setDate(d.getDate() + (existing.duration || 1));
    existing.targetDateFinish = d.toISOString().split('T')[0];
  }

  // Cascade dates to dependent tasks
  if (deltaDays !== 0) {
    cascadeTaskDates(taskMap, id, deltaDays);
  }

  // Save all modified tasks in a transaction
  const tx = db.transaction('tasks', 'readwrite');
  const store = tx.objectStore('tasks');
  for (const t of Object.values(taskMap)) {
    store.put(t);
  }
  await new Promise((res) => { tx.oncomplete = res; });

  return taskMap[id];
}

export async function dbDeleteTask(id) {
  const db = await getDB();
  // Also recursively delete children
  const tasks = await getAllFromStore(db, 'tasks');
  const toDelete = new Set([id]);

  let added = true;
  while (added) {
    added = false;
    for (const t of tasks) {
      if (t.parentId && toDelete.has(t.parentId) && !toDelete.has(t.id)) {
        toDelete.add(t.id);
        added = true;
      }
    }
  }

  const tx = db.transaction('tasks', 'readwrite');
  const store = tx.objectStore('tasks');
  for (const tid of toDelete) {
    store.delete(tid);
  }
  await new Promise((res) => { tx.oncomplete = res; });
  return true;
}

export async function dbReorderTasks(orderings) {
  const db = await getDB();
  const tx = db.transaction('tasks', 'readwrite');
  const store = tx.objectStore('tasks');

  for (const item of orderings) {
    const req = store.get(item.id);
    req.onsuccess = () => {
      if (req.result) {
        const task = req.result;
        task.order = item.order;
        if (item.parentId !== undefined) {
          task.parentId = item.parentId;
        }
        store.put(task);
      }
    };
  }

  await new Promise((res) => { tx.oncomplete = res; });
  return true;
}

// ---------------------------------------------------------------------------
// Vendors API
// ---------------------------------------------------------------------------

export async function dbFetchVendors() {
  const db = await getDB();
  return getAllFromStore(db, 'vendors');
}

export async function dbCreateVendor(vendorData) {
  const db = await getDB();
  const id = vendorData.id || crypto.randomUUID();
  const newVendor = {
    id,
    name: vendorData.name || '',
    company: vendorData.company || '',
    phone: vendorData.phone || '',
    email: vendorData.email || '',
    address: vendorData.address || '',
    accountNumber: vendorData.accountNumber || '',
    notes: vendorData.notes || '',
    interactions: Array.isArray(vendorData.interactions) ? vendorData.interactions : [],
    createdAt: vendorData.createdAt || new Date().toISOString().split('T')[0]
  };

  await putInStore(db, 'vendors', newVendor);
  return newVendor;
}

export async function dbUpdateVendor(id, updates) {
  const db = await getDB();
  const vendors = await getAllFromStore(db, 'vendors');
  const vendor = vendors.find(v => v.id === id);
  if (!vendor) throw new Error(`Vendor ${id} not found`);

  Object.assign(vendor, updates);
  await putInStore(db, 'vendors', vendor);
  return vendor;
}

export async function dbDeleteVendor(id) {
  const db = await getDB();
  return deleteFromStore(db, 'vendors', id);
}

export async function dbAddVendorInteraction(vendorId, interaction) {
  const db = await getDB();
  const vendors = await getAllFromStore(db, 'vendors');
  const vendor = vendors.find(v => v.id === vendorId);
  if (!vendor) throw new Error(`Vendor ${vendorId} not found`);

  const entry = {
    id: interaction.id || crypto.randomUUID(),
    date: interaction.date || new Date().toISOString().split('T')[0],
    type: interaction.type || 'phone',
    notes: interaction.notes || ''
  };

  if (!Array.isArray(vendor.interactions)) {
    vendor.interactions = [];
  }
  vendor.interactions.unshift(entry);
  await putInStore(db, 'vendors', vendor);
  return entry;
}

export async function dbUpdateVendorInteraction(vendorId, interactionId, updates) {
  const db = await getDB();
  const vendors = await getAllFromStore(db, 'vendors');
  const vendor = vendors.find(v => v.id === vendorId);
  if (!vendor) throw new Error(`Vendor ${vendorId} not found`);

  const item = (vendor.interactions || []).find(i => i.id === interactionId);
  if (!item) throw new Error(`Interaction ${interactionId} not found`);

  Object.assign(item, updates);
  await putInStore(db, 'vendors', vendor);
  return item;
}

export async function dbDeleteVendorInteraction(vendorId, interactionId) {
  const db = await getDB();
  const vendors = await getAllFromStore(db, 'vendors');
  const vendor = vendors.find(v => v.id === vendorId);
  if (!vendor) throw new Error(`Vendor ${vendorId} not found`);

  vendor.interactions = (vendor.interactions || []).filter(i => i.id !== interactionId);
  await putInStore(db, 'vendors', vendor);
  return true;
}

// ---------------------------------------------------------------------------
// Maintenance API
// ---------------------------------------------------------------------------

export async function dbFetchMaintenance() {
  const db = await getDB();
  return getAllFromStore(db, 'maintenance');
}

export async function dbCreateMaintenance(entryData) {
  const db = await getDB();
  const id = entryData.id || crypto.randomUUID();
  const newEntry = {
    id,
    date: entryData.date || new Date().toISOString().split('T')[0],
    type: entryData.type || 'maintenance',
    description: entryData.description || '',
    notes: entryData.notes || '',
    cost: entryData.cost || 0,
    performedBy: entryData.performedBy || '',
    createdAt: new Date().toISOString()
  };

  await putInStore(db, 'maintenance', newEntry);
  return newEntry;
}

export async function dbUpdateMaintenance(id, updates) {
  const db = await getDB();
  const entries = await getAllFromStore(db, 'maintenance');
  const entry = entries.find(e => e.id === id);
  if (!entry) throw new Error(`Maintenance entry ${id} not found`);

  Object.assign(entry, updates);
  await putInStore(db, 'maintenance', entry);
  return entry;
}

export async function dbDeleteMaintenance(id) {
  const db = await getDB();
  return deleteFromStore(db, 'maintenance', id);
}

// ---------------------------------------------------------------------------
// Owners API
// ---------------------------------------------------------------------------

export async function dbFetchOwners() {
  const db = await getDB();
  return getAllFromStore(db, 'owners');
}

export async function dbCreateOwner(ownerData) {
  const db = await getDB();
  const id = ownerData.id || crypto.randomUUID();
  const newOwner = {
    id,
    name: ownerData.name || '',
    email: ownerData.email || '',
    phone: ownerData.phone || '',
    notes: ownerData.notes || '',
    createdAt: new Date().toISOString().split('T')[0]
  };

  await putInStore(db, 'owners', newOwner);
  return newOwner;
}

export async function dbUpdateOwner(id, updates) {
  const db = await getDB();
  const owners = await getAllFromStore(db, 'owners');
  const owner = owners.find(o => o.id === id);
  if (!owner) throw new Error(`Owner ${id} not found`);

  Object.assign(owner, updates);
  await putInStore(db, 'owners', owner);
  return owner;
}

export async function dbDeleteOwner(id) {
  const db = await getDB();
  return deleteFromStore(db, 'owners', id);
}

// ---------------------------------------------------------------------------
// Full Project Export & Import (All Stores)
// ---------------------------------------------------------------------------

export async function dbExportAllData() {
  const db = await getDB();
  const [tasks, vendors, maintenance, owners] = await Promise.all([
    getAllFromStore(db, 'tasks'),
    getAllFromStore(db, 'vendors'),
    getAllFromStore(db, 'maintenance'),
    getAllFromStore(db, 'owners')
  ]);

  return {
    version: '1.0.1',
    exportedAt: new Date().toISOString(),
    tasks,
    vendors,
    maintenance,
    owners
  };
}

export async function dbImportAllData(data) {
  const stores = ['tasks', 'vendors', 'maintenance', 'owners'];
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid project file');
  const included = stores.filter(key => Object.hasOwn(data, key));
  if (!included.length) throw new Error('No project records found');
  for (const key of included) {
    if (!Array.isArray(data[key])) throw new Error(`Invalid ${key} list`);
    const ids = new Set();
    for (const row of data[key]) {
      if (!row || typeof row !== 'object' || typeof row.id !== 'string' || !row.id || ids.has(row.id)) throw new Error(`Invalid or duplicate ${key} id`);
      ids.add(row.id);
    }
  }
  const db = await getDB();
  const tx = db.transaction(included, 'readwrite');
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error || new Error('Import failed'));
    tx.onabort = () => reject(tx.error || new Error('Import aborted'));
    try {
      for (const key of included) {
        const store = tx.objectStore(key);
        store.clear();
        for (const row of data[key]) store.put(row);
      }
    } catch (error) { tx.abort(); reject(error); }
  });
}
