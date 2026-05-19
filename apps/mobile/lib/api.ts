import axios from 'axios';
import { router } from 'expo-router';
import { getAccessToken, getRefreshToken, getUser, setTokens, clearTokens } from './storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://staging-api.apppresente.com.br/api/v1';

export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const original = err.config;
    if (err.response?.status !== 401 || original._retry) {
      return Promise.reject(err);
    }

    original._retry = true;

    if (isRefreshing) {
      return new Promise((resolve) => {
        refreshQueue.push((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          resolve(api(original));
        });
      });
    }

    isRefreshing = true;
    try {
      const [refreshToken, user] = await Promise.all([getRefreshToken(), getUser()]);
      if (!refreshToken || !user) throw new Error('no_tokens');

      const { data } = await axios.post(`${API_URL}/auth/refresh`, {
        userId: user.id,
        refreshToken,
      });

      await setTokens(data.accessToken, data.refreshToken);
      refreshQueue.forEach((cb) => cb(data.accessToken));
      refreshQueue = [];

      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(original);
    } catch {
      await clearTokens();
      router.replace('/login-selector');
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
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
  // Staff
  list: (params?: Record<string, unknown>) =>
    api.get('/communications', { params }),
  get: (id: string) =>
    api.get(`/communications/${id}`),
  create: (data: Record<string, unknown>) =>
    api.post('/communications', data),
  send: (id: string) =>
    api.post(`/communications/${id}/send`),
  // Guardian
  guardianFeed: (params?: Record<string, unknown>) =>
    api.get('/communications/guardian/feed', { params }),
  trackViewed: (id: string, data: Record<string, unknown>) =>
    api.post(`/communications/${id}/viewed`, data),
  confirmRead: (id: string, data: Record<string, unknown>) =>
    api.post(`/communications/${id}/read`, data),
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
  // Staff
  list: (params?: Record<string, unknown>) =>
    api.get('/agenda', { params }),
  get: (id: string) =>
    api.get(`/agenda/${id}`),
  create: (data: Record<string, unknown>) =>
    api.post('/agenda', data),
  // Guardian
  guardianFeed: (params?: Record<string, unknown>) =>
    api.get('/agenda/guardian/feed', { params }),
};

// Forms (Guardian)
export const formsApi = {
  guardianForms: () =>
    api.get('/forms/guardian/available'),
  mySubmissions: () =>
    api.get('/forms/guardian/submissions'),
  submit: (id: string, data: Record<string, unknown>) =>
    api.post(`/forms/guardian/${id}/submit`, data),
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
  updateMe: (data: Record<string, unknown>) => api.put('/guardians/me', data),
  mySchools: () => api.get('/guardians/my-schools'),
};
