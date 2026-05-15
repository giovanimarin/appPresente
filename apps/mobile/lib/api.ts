import axios from 'axios';
import { getAccessToken, clearTokens } from './storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://staging-api.apppresente.com.br/api/v1';

export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    if (err.response?.status === 401) {
      await clearTokens();
    }
    return Promise.reject(err);
  },
);

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/staff/login', { email, password }),
  forgotPassword: (email: string) =>
    api.post('/auth/staff/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    api.post('/auth/staff/reset-password', { token, password }),
  completeFirstAccess: (token: string, password: string) =>
    api.post('/auth/staff/first-access', { token, password }),
  guardianLogin: (email: string, password: string) =>
    api.post('/auth/guardian/login', { email, password }),
  requestOtp: (email: string) =>
    api.post('/auth/guardian/request-otp', { email }),
  verifyOtp: (email: string, code: string) =>
    api.post('/auth/guardian/verify-otp', { email, code }),
};

// Communications
export const communicationsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/communications', { params }),
  get: (id: string) =>
    api.get(`/communications/${id}`),
  create: (data: Record<string, unknown>) =>
    api.post('/communications', data),
  send: (id: string) =>
    api.post(`/communications/${id}/send`),
};

// Classes
export const classesApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/classes', { params }),
  get: (id: string) =>
    api.get(`/classes/${id}`),
};

// Students
export const studentsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/students', { params }),
  get: (id: string) =>
    api.get(`/students/${id}`),
};

// Agenda
export const agendaApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/agenda', { params }),
  get: (id: string) =>
    api.get(`/agenda/${id}`),
  create: (data: Record<string, unknown>) =>
    api.post('/agenda', data),
};

// Appointments
export const appointmentsApi = {
  listSlots: (params?: Record<string, unknown>) =>
    api.get('/appointments/slots', { params }),
  createSlot: (data: Record<string, unknown>) =>
    api.post('/appointments/slots', data),
};

// Guardian (self)
export const guardianApi = {
  me: () => api.get('/guardians/me'),
};
