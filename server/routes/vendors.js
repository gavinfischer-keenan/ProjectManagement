import express from 'express';
import pool from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM vendors ORDER BY created_at ASC');
        const vendors = result.rows.map(row => ({
            id: row.id,
            name: row.name,
            company: row.company,
            email: row.email,
            phone: row.phone,
            address: row.address,
            accountNumber: row.account_number,
            category: row.category,
            website: row.website,
            onlineAccess: row.online_access,
            username: row.username,
            password: row.password,
            notes: row.notes,
            createdAt: row.created_at ? row.created_at.toISOString().split('T')[0] : null
        }));

        const interRes = await pool.query('SELECT * FROM vendor_interactions');
        const interactionsByVendor = {};
        interRes.rows.forEach(i => {
            if(!interactionsByVendor[i.vendor_id]) interactionsByVendor[i.vendor_id] = [];
            interactionsByVendor[i.vendor_id].push({
                id: i.id,
                date: i.interaction_date ? i.interaction_date.toISOString().split('T')[0] : null,
                type: i.interaction_type,
                notes: i.notes,
                linkedTaskId: i.linked_task_id
            });
        });

        vendors.forEach(v => v.interactions = interactionsByVendor[v.id] || []);

        res.json({ vendors });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/', async (req, res) => {
    const id = uuidv4();
    const { name, company, email, phone, address, accountNumber, category, website, onlineAccess, username, password, notes } = req.body;
    try {
        await pool.query(
            `INSERT INTO vendors (id, name, company, email, phone, address, account_number, category, website, online_access, username, password, notes, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())`,
            [id, name||'', company||'', email||'', phone||'', address||'', accountNumber||'', category||'', website||'', onlineAccess||'', username||'', password||'', notes||'']
        );
        res.status(201).json({ id, ...req.body });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, company, email, phone, address, accountNumber, category, website, onlineAccess, username, password, notes, interactions } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(
            `UPDATE vendors SET name=$1, company=$2, email=$3, phone=$4, address=$5, account_number=$6, category=$7, website=$8, online_access=$9, username=$10, password=$11, notes=$12 WHERE id=$13`,
            [name, company, email, phone, address, accountNumber, category, website, onlineAccess, username, password, notes, id]
        );

        if (interactions) {
            await client.query('DELETE FROM vendor_interactions WHERE vendor_id = $1', [id]);
            for(const i of interactions) {
                await client.query('INSERT INTO vendor_interactions (id, vendor_id, interaction_date, interaction_type, notes, linked_task_id) VALUES ($1, $2, $3, $4, $5, $6)',
                  [i.id || uuidv4(), id, i.date, i.type, i.notes, i.linkedTaskId]);
            }
        }
        await client.query('COMMIT');
        res.json({ id, ...req.body });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM vendors WHERE id=$1', [req.params.id]);
        res.status(204).end();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
