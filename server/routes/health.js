import express from 'express';
import pool from '../db.js';
const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const client = await pool.connect();
        const tables = ['tasks', 'vendors', 'owners', 'maintenance', 'assets', 'warranties'];
        const counts = {};
        for (const t of tables) {
            const res = await client.query(`SELECT COUNT(*) FROM ${t}`);
            counts[t] = parseInt(res.rows[0].count, 10);
        }
        client.release();
        res.json({ status: 'ok', database: 'connected', counts });
    } catch (err) {
        res.status(500).json({ status: 'error', error: err.message });
    }
});
export default router;
