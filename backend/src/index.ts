import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { initializeDatabase } from './db/schema.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import financingRoutes from './routes/financing.js';
import demoRoutes from './routes/demo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

initializeDatabase();

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'UP',
    service: 'finance-digital-factory',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/financing-requests', financingRoutes);
app.use('/api/demo', demoRoutes);

app.use(errorHandler);

app.listen(port, () => {
  console.log(`[backend] Finance Digital Factory listening on http://localhost:${port}`);
});
