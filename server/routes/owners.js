import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, '..', 'data', 'owners.json');

const router = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readOwners() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return data.owners || [];
  } catch {
    return [];
  }
}

function writeOwners(owners) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ owners }, null, 2), 'utf-8');
}

function todayISO() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// GET /  — list all owners (sorted by name)
// ---------------------------------------------------------------------------
router.get('/', (_req, res) => {
  try {
    const owners = readOwners();
    owners.sort((a, b) => (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()));
    return res.json(owners);
  } catch (err) {
    console.error('GET /owners error:', err);
    return res.status(500).json({ error: 'Failed to read owners' });
  }
});

// ---------------------------------------------------------------------------
// POST /  — create a new owner
// ---------------------------------------------------------------------------
router.post('/', (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    const owners = readOwners();
    const newOwner = {
      id: uuidv4(),
      name: name.trim(),
      email: req.body.email || '',
      phone: req.body.phone || '',
      notes: req.body.notes || '',
      createdAt: todayISO(),
    };

    owners.push(newOwner);
    writeOwners(owners);
    return res.status(201).json(newOwner);
  } catch (err) {
    console.error('POST /owners error:', err);
    return res.status(500).json({ error: 'Failed to create owner' });
  }
});

// ---------------------------------------------------------------------------
// PUT /:id  — update owner fields
// ---------------------------------------------------------------------------
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const owners = readOwners();
    const index = owners.findIndex((o) => o.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Owner not found' });
    }

    const updatable = ['name', 'email', 'phone', 'notes'];
    for (const field of updatable) {
      if (field in req.body) {
        owners[index][field] = req.body[field];
      }
    }

    writeOwners(owners);
    return res.json(owners[index]);
  } catch (err) {
    console.error('PUT /owners/:id error:', err);
    return res.status(500).json({ error: 'Failed to update owner' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id  — delete an owner
// ---------------------------------------------------------------------------
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const owners = readOwners();
    const index = owners.findIndex((o) => o.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Owner not found' });
    }

    owners.splice(index, 1);
    writeOwners(owners);
    return res.json({ deleted: id });
  } catch (err) {
    console.error('DELETE /owners/:id error:', err);
    return res.status(500).json({ error: 'Failed to delete owner' });
  }
});

export default router;
