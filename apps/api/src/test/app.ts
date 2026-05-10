// Instância do Express para testes (sem iniciar o servidor)
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { errorHandler, notFoundHandler } from '../middlewares/errorHandler';
import authRoutes from '../modules/auth/auth.routes';
import guardianRoutes from '../modules/guardians/guardians.routes';
import classRoutes from '../modules/classes/classes.routes';
import studentRoutes from '../modules/classes/students.routes';
import appointmentRoutes from '../modules/appointments/appointments.routes';
import communicationRoutes from '../modules/communications/communications.routes';
import formRoutes from '../modules/forms/forms.routes';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/guardians', guardianRoutes);
app.use('/api/v1/classes', classRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/appointments', appointmentRoutes);
app.use('/api/v1/communications', communicationRoutes);
app.use('/api/v1/forms', formRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
