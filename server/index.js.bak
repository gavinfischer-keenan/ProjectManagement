import "dotenv/config";
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import tasksRouter from './routes/tasks.js';
import maintenanceRouter from './routes/maintenance.js';
import importRouter from './routes/import.js';
import vendorsRouter from './routes/vendors.js';
import ownersRouter from './routes/owners.js';
import assetsRouter from './routes/assets.js';
import warrantiesRouter from './routes/warranties.js';
import purgeRouter from './routes/purge.js';
import healthRouter from './routes/health.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json());

// API Routes
app.use('/api/tasks', tasksRouter);
app.use('/api/maintenance', maintenanceRouter);
app.use('/api/import', importRouter);
app.use('/api/vendors', vendorsRouter);
app.use('/api/owners', ownersRouter);
app.use('/api/assets', assetsRouter);
app.use('/api/warranties', warrantiesRouter);
app.use('/api/purge', purgeRouter);
app.use('/api/health', healthRouter);

// Production: serve Vite build
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Global error handler
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Hawaii PM server running on http://localhost:${PORT}`);
});
