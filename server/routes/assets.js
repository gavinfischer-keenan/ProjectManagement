import express from 'express';
import pool from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM assets ORDER BY created_at ASC');
        const assets = result.rows.map(row => ({
            id: row.id,
            name: row.name,
            category: row.category,
            serialNumber: row.serial_number,
            modelNumber: row.model_number,
            manufacturer: row.manufacturer,
            vendorId: row.vendor_id,
            installLocation: row.install_location,
            installDate: row.install_date ? row.install_date.toISOString().split('T')[0] : null,
            purchaseDate: row.purchase_date ? row.purchase_date.toISOString().split('T')[0] : null,
            cost: row.cost,
            haEntityId: row.ha_entity_id,
            notes: row.notes,
            createdAt: row.created_at
        }));
        res.json({ assets });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/', async (req, res) => {
    const id = uuidv4();
    const { name, category, serialNumber, modelNumber, manufacturer, vendorId, installLocation, installDate, purchaseDate, cost, haEntityId, notes } = req.body;
    try {
        await pool.query(
            `INSERT INTO assets (id, name, category, serial_number, model_number, manufacturer, vendor_id, install_location, install_date, purchase_date, cost, ha_entity_id, notes, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())`,
            [id, name, category, serialNumber, modelNumber, manufacturer, vendorId, installLocation, installDate, purchaseDate, cost, haEntityId, notes]
        );
        res.status(201).json({ id, ...req.body });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/:id', async (req, res) => {
    const { name, category, serialNumber, modelNumber, manufacturer, vendorId, installLocation, installDate, purchaseDate, cost, haEntityId, notes } = req.body;
    try {
        await pool.query(
            `UPDATE assets SET name=$1, category=$2, serial_number=$3, model_number=$4, manufacturer=$5, vendor_id=$6, install_location=$7, install_date=$8, purchase_date=$9, cost=$10, ha_entity_id=$11, notes=$12 WHERE id=$13`,
            [name, category, serialNumber, modelNumber, manufacturer, vendorId, installLocation, installDate, purchaseDate, cost, haEntityId, notes, req.params.id]
        );
        res.json(req.body);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM assets WHERE id=$1', [req.params.id]);
        res.status(204).end();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
