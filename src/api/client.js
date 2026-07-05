/* ═══════════════════════════════════════════════════════════════
   API Client — Hawaii Project Manager
   ═══════════════════════════════════════════════════════════════ */

const BASE_URL = '/api';

/**
 * Generic fetch helper — throws on non-OK responses.
 */
async function request(url, options = {}) {
  const res = await fetch(`${BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    let errorMessage;
    try {
      const body = await res.json();
      errorMessage = body.error || body.message || res.statusText;
    } catch {
      errorMessage = res.statusText || `HTTP ${res.status}`;
    }
    throw new Error(errorMessage);
  }

  // 204 No Content
  if (res.status === 204) return null;

  return res.json();
}

/* ── Tasks ──────────────────────────────────────────────────── */

export async function fetchTasks() {
  return request('/tasks');
}

export async function createTask(task) {
  return request('/tasks', {
    method: 'POST',
    body: JSON.stringify(task),
  });
}

export async function updateTask(id, updates) {
  return request(`/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteTask(id) {
  return request(`/tasks/${id}`, {
    method: 'DELETE',
  });
}

export async function reorderTasks(orderings) {
  return request('/tasks/reorder', {
    method: 'PATCH',
    body: JSON.stringify({ orderings }),
  });
}

/* ── Maintenance ────────────────────────────────────────────── */

export async function fetchMaintenance() {
  return request('/maintenance');
}

export async function createMaintenance(entry) {
  return request('/maintenance', {
    method: 'POST',
    body: JSON.stringify(entry),
  });
}

export async function updateMaintenance(id, updates) {
  return request(`/maintenance/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteMaintenance(id) {
  return request(`/maintenance/${id}`, {
    method: 'DELETE',
  });
}

/* ── Import ─────────────────────────────────────────────────── */

export async function importExcel(formData) {
  const res = await fetch(`${BASE_URL}/import`, {
    method: 'POST',
    body: formData,
    // Do NOT set Content-Type — browser sets multipart boundary automatically
  });

  if (!res.ok) {
    let errorMessage;
    try {
      const body = await res.json();
      errorMessage = body.error || body.message || res.statusText;
    } catch {
      errorMessage = res.statusText || `HTTP ${res.status}`;
    }
    throw new Error(errorMessage);
  }

  return res.json();
}
