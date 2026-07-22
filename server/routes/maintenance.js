import express from 'express';
import pool from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM maintenance ORDER BY created_at ASC');
        const maintenance = result.rows.map(row => ({
            id: row.id,
            description: row.description,
            taskId: row.task_id,
            dateOfRepair: row.date_of_repair ? row.date_of_repair.toISOString().split('T')[0] : null,
            dateWhenFixed: row.date_when_fixed ? row.date_when_fixed.toISOString().split('T')[0] : null,
            newInstallation: row.new_installation,
            newInstallationDate: row.new_installation_date ? row.new_installation_date.toISOString().split('T')[0] : null,
            notes: row.notes,
            isMilestone: row.is_milestone,
            milestoneText: row.milestone_text,
            sectionId: row.section_id,
            sectionName: row.section_name,
            createdAt: row.created_at ? row.created_at.toISOString().split('T')[0] : null
        }));
        res.json({ maintenance });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/', async (req, res) => {
    const id = uuidv4();
    const { description, taskId, dateOfRepair, dateWhenFixed, newInstallation, newInstallationDate, notes, isMilestone, milestoneText, sectionId, sectionName } = req.body;
    try {
        await pool.query(
            `INSERT INTO maintenance (id, description, task_id, date_of_repair, date_when_fixed, new_installation, new_installation_date, notes, is_milestone, milestone_text, section_id, section_name, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
            [id, description, taskId, dateOfRepair, dateWhenFixed, newInstallation, newInstallationDate, notes, isMilestone, milestoneText, sectionId, sectionName]
        );
        res.status(201).json({ id, ...req.body });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/:id', async (req, res) => {
    const { description, taskId, dateOfRepair, dateWhenFixed, newInstallation, newInstallationDate, notes, isMilestone, milestoneText, sectionId, sectionName } = req.body;
    try {
        await pool.query(
            `UPDATE maintenance SET description=$1, task_id=$2, date_of_repair=$3, date_when_fixed=$4, new_installation=$5, new_installation_date=$6, notes=$7, is_milestone=$8, milestone_text=$9, section_id=$10, section_name=$11 WHERE id=$12`,
            [description, taskId, dateOfRepair, dateWhenFixed, newInstallation, newInstallationDate, notes, isMilestone, milestoneText, sectionId, sectionName, req.params.id]
        );
        res.json(req.body);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM maintenance WHERE id=$1', [req.params.id]);
        res.status(204).end();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
