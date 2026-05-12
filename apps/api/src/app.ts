import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { prisma } from './config/database';
import { redis } from './config/redis';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';

// Routes
import authRoutes from './modules/auth/auth.routes';
import schoolRoutes from './modules/schools/schools.routes';
import userRoutes from './modules/users/users.routes';
import classRoutes from './modules/classes/classes.routes';
import studentRoutes from './modules/classes/students.routes';
import guardianRoutes from './modules/guardians/guardians.routes';
import communicationRoutes from './modules/communications/communications.routes';
import uploadRoutes from './modules/uploads/uploads.routes';
import agendaRoutes from './modules/agenda/agenda.routes';
import formRoutes from './modules/forms/forms.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import platformRoutes from './modules/platform/platform.routes';
import appointmentRoutes from './modules/appointments/appointments.routes';
import roomRoutes from './modules/rooms/rooms.routes';

const app = express();

// ── Segurança e parsing ───────────────────────────────────────────────────
app.use(helmet());
const allowedOrigins = env.FRONTEND_URL.split(',').map(o => o.trim());
app.use(
  cors({
    origin: process.env.NODE_ENV === 'production'
      ? (origin, cb) => {
          if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
          cb(new Error(`CORS: origem não permitida: ${origin}`));
        }
      : true,
    credentials: true,
  }),
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health check ─────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API Routes ────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/schools', schoolRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/classes', classRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/guardians', guardianRoutes);
app.use('/api/v1/communications', communicationRoutes);
app.use('/api/v1/uploads', uploadRoutes);
app.use('/api/v1/agenda', agendaRoutes);
app.use('/api/v1/forms', formRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/platform', platformRoutes);
app.use('/api/v1/appointments', appointmentRoutes);
app.use('/api/v1/rooms', roomRoutes);

// ── 404 + Error Handler ──────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── Start Server ─────────────────────────────────────────────────────────
async function bootstrap() {
  try {
    await prisma.$connect();
    console.log('[DB] PostgreSQL conectado');

    await redis.connect();
    console.log('[Redis] Conectado');

    app.listen(env.PORT, () => {
      console.log(`[API] Servidor rodando em http://localhost:${env.PORT}`);
      console.log(`[API] Ambiente: ${env.NODE_ENV}`);
    });
  } catch (err) {
    console.error('[Bootstrap] Erro ao iniciar:', err);
    process.exit(1);
  }
}

bootstrap();

export default app;
