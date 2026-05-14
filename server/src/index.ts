import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import assetRoutes from './routes/assets';
import liabilityRoutes from './routes/liabilities';
import networthRoutes from './routes/networth';
// import documentRoutes from './routes/documents';  // Step 6
// import floRoutes from './routes/flo';             // Step 7
// import goalRoutes from './routes/goals';          // Step 8
// import billingRoutes from './routes/billing';     // Step 14

import { startPriceRefreshCron } from './cron/priceRefresh';
import { startMonthlySnapshotCron } from './cron/monthlySnapshot';

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Security middleware ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Global rate limit ────────────────────────────────────────────────────────
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
}));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/liabilities', liabilityRoutes);
app.use('/api/networth', networthRoutes);
// app.use('/api/documents', documentRoutes);  // Step 6
// app.use('/api/flo', floRoutes);             // Step 7
// app.use('/api/goals', goalRoutes);          // Step 8
// app.use('/api/billing', billingRoutes);     // Step 14

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Global error handler ────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
});

app.listen(PORT, () => {
  console.log(`LegacyOS server running on port ${PORT}`);
  startPriceRefreshCron();
  startMonthlySnapshotCron();
});

export default app;
