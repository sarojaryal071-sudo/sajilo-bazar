import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { authRoutes } from './modules/auth/auth.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';
import { workersRoutes } from './modules/workers/workers.routes.js';
import { bookingsRoutes } from './modules/bookings/bookings.routes.js';
import { notificationsRoutes } from './modules/notifications/notifications.routes.js';
import { commissionLedgerRoutes } from './modules/commissionLedger/commissionLedger.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';
import { notFoundHandler, errorHandler } from './middleware/error.middleware.js';

export const app = express();

app.use(cors({ origin: process.env.WEB_ORIGIN || true }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/workers', workersRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/commission-ledger', commissionLedgerRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
