import express from 'express';
import pool from '../db.js';
const router = express.Router();

router.post('/', async (req, res) => {
    try {
        await pool.query('BEGIN');
        await pool.query('DELETE FROM maintenance');
        await pool.query('DELETE FROM task_supplies');
        await pool.query('DELETE FROM tasks');
        await pool.query('COMMIT');
        res.json({ success: true, message: 'Purged tasks and maintenance' });
    } catch (err) {
        await pool.query('ROLLBACK');
        res.status(500).json({ error: 'Failed to purge' });
    }
});
export default router;
