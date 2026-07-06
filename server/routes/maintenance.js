import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, '..', 'data', 'maintenance.json');

const router = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readEntries() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return data.entries || [];
  } catch {
    return [];
  }
}

function writeEntries(entries) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ entries }, null, 2), 'utf-8');
}

// ---------------------------------------------------------------------------
// GET /  — list all maintenance entries
// ---------------------------------------------------------------------------
router.get('/', (_req, res) => {
  try {
    const entries = readEntries();
    return res.json(entries);
  } catch (err) {
    console.error('GET /maintenance error:', err);
    return res.status(500).json({ error: 'Failed to read maintenance entries' });
  }
});

// ---------------------------------------------------------------------------
// POST /  — create a new maintenance entry
// ---------------------------------------------------------------------------
router.post('/', (req, res) => {
  try {
    const { description } = req.body;

    if (!description || typeof description !== 'string' || description.trim() === '') {
      return res.status(400).json({ error: 'description is required' });
    }

    const entries = readEntries();

    const newEntry = {
      id: uuidv4(),
      description: description.trim(),
      taskId: req.body.taskId ?? null,
      dateOfRepair: req.body.dateOfRepair ?? null,
      dateWhenFixed: req.body.dateWhenFixed ?? null,
      newInstallation: req.body.newInstallation ?? false,
      newInstallationDate: req.body.newInstallationDate ?? null,
      notes: req.body.notes ?? '',
      // Milestone fields
      isMilestone: req.body.isMilestone ?? false,
      milestoneText: req.body.milestoneText ?? '',
      sectionId: req.body.sectionId ?? null,
      sectionName: req.body.sectionName ?? '',
    };

    entries.push(newEntry);
    writeEntries(entries);

    return res.status(201).json(newEntry);
  } catch (err) {
    console.error('POST /maintenance error:', err);
    return res.status(500).json({ error: 'Failed to create maintenance entry' });
  }
});

// ---------------------------------------------------------------------------
// PUT /:id  — update a maintenance entry (partial updates allowed)
// ---------------------------------------------------------------------------
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const entries = readEntries();
    const index = entries.findIndex((e) => e.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Maintenance entry not found' });
    }

    const updatable = [
      'description', 'taskId', 'dateOfRepair', 'dateWhenFixed',
      'newInstallation', 'newInstallationDate', 'notes',
      'isMilestone', 'milestoneText', 'sectionId', 'sectionName',
    ];

    for (const field of updatable) {
      if (field in req.body) {
        entries[index][field] = req.body[field];
      }
    }

    writeEntries(entries);
    return res.json(entries[index]);
  } catch (err) {
    console.error('PUT /maintenance/:id error:', err);
    return res.status(500).json({ error: 'Failed to update maintenance entry' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id  — delete a maintenance entry
// ---------------------------------------------------------------------------
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const entries = readEntries();
    const index = entries.findIndex((e) => e.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Maintenance entry not found' });
    }

    entries.splice(index, 1);
    writeEntries(entries);

    return res.json({ deleted: id });
  } catch (err) {
    console.error('DELETE /maintenance/:id error:', err);
    return res.status(500).json({ error: 'Failed to delete maintenance entry' });
  }
});

export default router;
