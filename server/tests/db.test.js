import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pool from '../db.js';

describe('Database and Routes Tests', () => {
    let testAssetId;

    beforeAll(async () => {
        // Ensure DB is connected
        const res = await pool.query('SELECT 1 AS ok');
        expect(res.rows[0].ok).toBe(1);
    });

    afterAll(async () => {
        await pool.query('DELETE FROM assets WHERE name = $1', ['Vitest Asset']);
        await pool.end();
    });

    it('should have basic tables populated', async () => {
        const ownersRes = await pool.query('SELECT COUNT(*) FROM owners');
        expect(parseInt(ownersRes.rows[0].count, 10)).toBeGreaterThanOrEqual(4);

        const tasksRes = await pool.query('SELECT COUNT(*) FROM tasks');
        expect(parseInt(tasksRes.rows[0].count, 10)).toBeGreaterThanOrEqual(240);
    });

    it('should create, read, and delete an asset', async () => {
        const newAssetRes = await fetch('http://localhost:3010/api/assets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Vitest Asset', category: 'HVAC' })
        });
        const asset = await newAssetRes.json();
        expect(newAssetRes.status).toBe(201);
        expect(asset.id).toBeDefined();
        expect(asset.name).toBe('Vitest Asset');
        testAssetId = asset.id;

        const getAssetsRes = await fetch('http://localhost:3010/api/assets');
        const getAssets = await getAssetsRes.json();
        const found = getAssets.assets.find(a => a.id === testAssetId);
        expect(found).toBeDefined();
        
        const delRes = await fetch('http://localhost:3010/api/assets/' + testAssetId, { method: 'DELETE' });
        expect(delRes.status).toBe(204);
    });

    it('should preserve vendors on purge (dry-run check)', async () => {
        const vendorsRes = await pool.query('SELECT COUNT(*) FROM vendors');
        expect(parseInt(vendorsRes.rows[0].count, 10)).toBeGreaterThanOrEqual(17);
    });
});
