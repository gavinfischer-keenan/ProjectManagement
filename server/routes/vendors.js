import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, '..', 'data', 'vendors.json');

const router = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readVendors() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return data.vendors || [];
  } catch {
    return [];
  }
}

function writeVendors(vendors) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ vendors }, null, 2), 'utf-8');
}

function todayISO() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// GET /  — list all vendors (sorted by company then name)
// ---------------------------------------------------------------------------
router.get('/', (_req, res) => {
  try {
    const vendors = readVendors();
    vendors.sort((a, b) => {
      const compA = (a.company || '').toLowerCase();
      const compB = (b.company || '').toLowerCase();
      if (compA !== compB) return compA.localeCompare(compB);
      return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase());
    });
    return res.json(vendors);
  } catch (err) {
    console.error('GET /vendors error:', err);
    return res.status(500).json({ error: 'Failed to read vendors' });
  }
});

// ---------------------------------------------------------------------------
// POST /  — create a new vendor
// ---------------------------------------------------------------------------
router.post('/', (req, res) => {
  try {
    const { name, company } = req.body;
    if (!name && !company) {
      return res.status(400).json({ error: 'name or company is required' });
    }

    const vendors = readVendors();
    const newVendor = {
      id: uuidv4(),
      name: req.body.name || '',
      company: req.body.company || '',
      email: req.body.email || '',
      phone: req.body.phone || '',
      address: req.body.address || '',
      accountNumber: req.body.accountNumber || '',
      notes: req.body.notes || '',
      interactions: [],
      createdAt: todayISO(),
    };

    vendors.push(newVendor);
    writeVendors(vendors);
    return res.status(201).json(newVendor);
  } catch (err) {
    console.error('POST /vendors error:', err);
    return res.status(500).json({ error: 'Failed to create vendor' });
  }
});

// ---------------------------------------------------------------------------
// PUT /:id  — update vendor fields
// ---------------------------------------------------------------------------
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const vendors = readVendors();
    const index = vendors.findIndex((v) => v.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const updatable = ['name', 'company', 'email', 'phone', 'address', 'accountNumber', 'notes'];
    for (const field of updatable) {
      if (field in req.body) {
        vendors[index][field] = req.body[field];
      }
    }

    writeVendors(vendors);
    return res.json(vendors[index]);
  } catch (err) {
    console.error('PUT /vendors/:id error:', err);
    return res.status(500).json({ error: 'Failed to update vendor' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id  — delete a vendor
// ---------------------------------------------------------------------------
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const vendors = readVendors();
    const index = vendors.findIndex((v) => v.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    vendors.splice(index, 1);
    writeVendors(vendors);
    return res.json({ deleted: id });
  } catch (err) {
    console.error('DELETE /vendors/:id error:', err);
    return res.status(500).json({ error: 'Failed to delete vendor' });
  }
});

// ---------------------------------------------------------------------------
// POST /:id/interactions  — add a CRM interaction log entry
// ---------------------------------------------------------------------------
router.post('/:id/interactions', (req, res) => {
  try {
    const { id } = req.params;
    const vendors = readVendors();
    const vendor = vendors.find((v) => v.id === id);

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const newInteraction = {
      id: uuidv4(),
      date: req.body.date || todayISO(),
      type: req.body.type || 'phone',  // phone | text | email
      notes: req.body.notes || '',
      linkedTaskId: req.body.linkedTaskId || null,
    };

    if (!vendor.interactions) vendor.interactions = [];
    vendor.interactions.unshift(newInteraction); // newest first
    writeVendors(vendors);
    return res.status(201).json(newInteraction);
  } catch (err) {
    console.error('POST /vendors/:id/interactions error:', err);
    return res.status(500).json({ error: 'Failed to add interaction' });
  }
});

// ---------------------------------------------------------------------------
// PUT /:id/interactions/:iid  — edit an interaction
// ---------------------------------------------------------------------------
router.put('/:id/interactions/:iid', (req, res) => {
  try {
    const { id, iid } = req.params;
    const vendors = readVendors();
    const vendor = vendors.find((v) => v.id === id);

    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

    const idx = (vendor.interactions || []).findIndex((i) => i.id === iid);
    if (idx === -1) return res.status(404).json({ error: 'Interaction not found' });

    const updatable = ['date', 'type', 'notes', 'linkedTaskId'];
    for (const field of updatable) {
      if (field in req.body) {
        vendor.interactions[idx][field] = req.body[field];
      }
    }

    writeVendors(vendors);
    return res.json(vendor.interactions[idx]);
  } catch (err) {
    console.error('PUT /vendors/:id/interactions/:iid error:', err);
    return res.status(500).json({ error: 'Failed to update interaction' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id/interactions/:iid  — delete an interaction
// ---------------------------------------------------------------------------
router.delete('/:id/interactions/:iid', (req, res) => {
  try {
    const { id, iid } = req.params;
    const vendors = readVendors();
    const vendor = vendors.find((v) => v.id === id);

    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

    const idx = (vendor.interactions || []).findIndex((i) => i.id === iid);
    if (idx === -1) return res.status(404).json({ error: 'Interaction not found' });

    vendor.interactions.splice(idx, 1);
    writeVendors(vendors);
    return res.json({ deleted: iid });
  } catch (err) {
    console.error('DELETE /vendors/:id/interactions/:iid error:', err);
    return res.status(500).json({ error: 'Failed to delete interaction' });
  }
});

export default router;
