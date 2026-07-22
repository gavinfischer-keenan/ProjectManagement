import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
    user: 'pm_user',
    host: '192.168.1.104',
    database: 'project_mgr',
    password: 'pukalani_pm',
    port: 5432,
});

const dataDir = path.join(__dirname, 'server', 'data');

async function migrate() {
    console.log('Starting migration...');
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        let ownersCount = 0;
        const ownersFile = path.join(dataDir, 'owners.json');
        if (fs.existsSync(ownersFile)) {
            const ownersData = JSON.parse(fs.readFileSync(ownersFile, 'utf8'));
            for (const owner of (ownersData.owners || [])) {
                await client.query(
                    `INSERT INTO owners (id, name, email, phone, notes, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [owner.id, owner.name, owner.email, owner.phone, owner.notes, owner.createdAt || new Date()]
                );
                ownersCount++;
            }
        }
        console.log(`Migrated ${ownersCount} owners.`);

        let vendorsCount = 0;
        let vendorInteractionsCount = 0;
        const vendorsFile = path.join(dataDir, 'vendors.json');
        if (fs.existsSync(vendorsFile)) {
            const vendorsData = JSON.parse(fs.readFileSync(vendorsFile, 'utf8'));
            for (const vendor of (vendorsData.vendors || [])) {
                await client.query(
                    `INSERT INTO vendors (id, name, company, email, phone, address, account_number, category, website, online_access, username, password, notes, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
                    [
                        vendor.id, vendor.name || '', vendor.company || '', vendor.email || '', vendor.phone || '', 
                        vendor.address || '', vendor.accountNumber || '', vendor.category || '', vendor.website || '',
                        vendor.onlineAccess || '', vendor.username || '', vendor.password || '', vendor.notes || '',
                        vendor.createdAt || new Date()
                    ]
                );
                vendorsCount++;

                for (const interaction of (vendor.interactions || [])) {
                    await client.query(
                        `INSERT INTO vendor_interactions (id, vendor_id, interaction_date, interaction_type, notes, linked_task_id)
                         VALUES ($1, $2, $3, $4, $5, $6)`,
                        [
                            interaction.id, vendor.id, interaction.date || null, interaction.type || '',
                            interaction.notes || '', interaction.linkedTaskId || null
                        ]
                    );
                    vendorInteractionsCount++;
                }
            }
        }
        console.log(`Migrated ${vendorsCount} vendors and ${vendorInteractionsCount} vendor interactions.`);

        let tasksCount = 0;
        let taskSuppliesCount = 0;
        const tasksFile = path.join(dataDir, 'tasks.json');
        let tasksData = [];
        if (fs.existsSync(tasksFile)) {
            const parsed = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));
            tasksData = parsed.tasks || [];
            
            const insertTask = async (task) => {
                await client.query(
                    `INSERT INTO tasks (id, parent_id, sort_order, name, task_type, dependency, depends_on_task_id, notes,
                     target_date_start, target_date_finish, date_started, date_finished, duration_days, status, delayed,
                     percent_complete, is_milestone, milestone_text, is_hardware, hardware_text, vendor_id, owner_id, ha_entity_id, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)`,
                    [
                        task.id, task.parentId || null, task.order || 0, task.name || '', task.taskType || 'task',
                        task.dependency || '', task.dependsOnTaskId || null, task.notes || '',
                        task.targetDateStart || null, task.targetDateFinish || null, task.dateStarted || null,
                        task.dateFinished || null, task.duration || 0, task.status || 'Not Started',
                        task.delayed || false, task.percentComplete || 0, task.isMilestone || false,
                        task.milestoneText || '', task.isHardware || false, task.hardwareText || '',
                        task.vendorId || null, task.ownerId || null, task.haEntityId || '',
                        task.createdAt || new Date()
                    ]
                );
                tasksCount++;

                for (const supply of (task.supplies || [])) {
                    await client.query(
                        `INSERT INTO task_supplies (id, task_id, name, qty, cost, checked_off)
                         VALUES ($1, $2, $3, $4, $5, $6)`,
                        [
                            supply.id, task.id, supply.name || '', supply.qty || 1, 
                            supply.cost || 0, supply.checkedOff || false
                        ]
                    );
                    taskSuppliesCount++;
                }
            };
            
            const tasksById = new Map();
            tasksData.forEach(t => tasksById.set(t.id, t));
            const inserted = new Set();
            
            const insertWithParents = async (taskId) => {
                if (inserted.has(taskId)) return;
                const task = tasksById.get(taskId);
                if (!task) return;
                
                if (task.parentId && !inserted.has(task.parentId)) {
                    await insertWithParents(task.parentId);
                }
                
                await insertTask(task);
                inserted.add(taskId);
            };

            for (const task of tasksData) {
                await insertWithParents(task.id);
            }
        }
        console.log(`Migrated ${tasksCount} tasks and ${taskSuppliesCount} task supplies.`);

        let maintenanceCount = 0;
        const maintenanceFile = path.join(dataDir, 'maintenance.json');
        if (fs.existsSync(maintenanceFile)) {
            const maintData = JSON.parse(fs.readFileSync(maintenanceFile, 'utf8'));
            for (const maint of (maintData.maintenance || [])) {
                await client.query(
                    `INSERT INTO maintenance (id, description, task_id, date_of_repair, date_when_fixed, new_installation,
                     new_installation_date, notes, is_milestone, milestone_text, section_id, section_name, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                    [
                        maint.id, maint.description || '', maint.taskId || null, maint.dateOfRepair || null,
                        maint.dateWhenFixed || null, maint.newInstallation || false, maint.newInstallationDate || null,
                        maint.notes || '', maint.isMilestone || false, maint.milestoneText || '',
                        maint.sectionId || null, maint.sectionName || '', maint.createdAt || new Date()
                    ]
                );
                maintenanceCount++;
            }
        }
        console.log(`Migrated ${maintenanceCount} maintenance records.`);

        await client.query('COMMIT');
        console.log('Migration completed successfully.');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', e);
    } finally {
        client.release();
        pool.end();
    }
}

migrate();
