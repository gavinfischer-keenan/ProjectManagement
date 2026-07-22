import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    user: process.env.DB_USER || 'pm_user',
    host: process.env.DB_HOST || '192.168.1.104',
    database: process.env.DB_NAME || 'project_mgr',
    password: process.env.DB_PASSWORD || 'pukalani_pm',
    port: process.env.DB_PORT || 5432,
});

export default pool;
