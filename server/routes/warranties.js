import express from 'express';
import pool from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM warranties');
        const warranties = result.rows.map(row => ({
            id: row.id,
            assetId: row.asset_id,
            warrantyType: row.warranty_type,
            provider: row.provider,
            startDate: row.start_date ? row.start_date.toISOString().split('T')[0] : null,
            endDate: row.end_date ? row.end_date.toISOString().split('T')[0] : null,
            coverageDetails: row.coverage_details,
            claimPhone: row.claim_phone,
            claimUrl: row.claim_url,
            documentPath: row.document_path,
            notes: row.notes
        }));
        res.json({ warranties });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/', async (req, res) => {
    const id = uuidv4();
    const { assetId, warrantyType, provider, startDate, endDate, coverageDetails, claimPhone, claimUrl, documentPath, notes } = req.body;
    try {
        await pool.query(
            `INSERT INTO warranties (id, asset_id, warranty_type, provider, start_date, end_date, coverage_details, claim_phone, claim_url, document_path, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [id, assetId, warrantyType, provider, startDate, endDate, coverageDetails, claimPhone, claimUrl, documentPath, notes]
        );
        res.status(201).json({ id, ...req.body });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/:id', async (req, res) => {
    const { assetId, warrantyType, provider, startDate, endDate, coverageDetails, claimPhone, claimUrl, documentPath, notes } = req.body;
    try {
        await pool.query(
            `UPDATE warranties SET asset_id=$1, warranty_type=$2, provider=$3, start_date=$4, end_date=$5, coverage_details=$6, claim_phone=$7, claim_url=$8, document_path=$9, notes=$10 WHERE id=$11`,
            [assetId, warrantyType, provider, startDate, endDate, coverageDetails, claimPhone, claimUrl, documentPath, notes, req.params.id]
        );
        res.json(req.body);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM warranties WHERE id=$1', [req.params.id]);
        res.status(204).end();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
