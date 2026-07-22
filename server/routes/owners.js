import express from 'express';
import pool from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM owners ORDER BY created_at ASC');
        const owners = result.rows.map(row => ({
            id: row.id,
            name: row.name,
            email: row.email,
            phone: row.phone,
            notes: row.notes,
            createdAt: row.created_at
        }));
        res.json({ owners });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/', async (req, res) => {
    const { id, name, email, phone, notes, createdAt } = req.body;
    try {
        await pool.query(
            `INSERT INTO owners (id, name, email, phone, notes, created_at)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [id, name, email, phone, notes, createdAt || new Date()]
        );
        res.status(201).json(req.body);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/:id', async (req, res) => {
    const { name, email, phone, notes } = req.body;
    try {
        await pool.query(
            `UPDATE owners SET name=$1, email=$2, phone=$3, notes=$4 WHERE id=$5`,
            [name, email, phone, notes, req.params.id]
        );
        res.json(req.body);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM owners WHERE id=$1', [req.params.id]);
        res.status(204).end();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
