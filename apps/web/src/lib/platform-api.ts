import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export const platformApi = axios.create({
  baseURL: `${API_URL}/platform`,
  headers: { 'Content-Type': 'application/json' },
});

if (typeof window !== 'undefined') {
  platformApi.interceptors.request.use((config) => {
    const token = localStorage.getItem('platformToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  platformApi.interceptors.response.use(
    (r) => r,
    (err) => {
      if (err.response?.status === 401) {
        localStorage.removeItem('platformToken');
        window.location.href = '/platform/login';
      }
      return Promise.reject(err);
    },
  );
}

export const platformAuthApi = {
  login: (email: string, password: string) =>
    platformApi.post('/auth/login', { email, password }),
};

export const schoolsApi = {
  summary: () => platformApi.get('/summary'),
  list: (params?: unknown) => platformApi.get('/schools', { params }),
  health: (id: string) => platformApi.get(`/schools/${id}`),
  update: (id: string, data: unknown) => platformApi.patch(`/schools/${id}`, data),
  create: (data: unknown) => platformApi.post('/schools', data),
  archive: (id: string) => platformApi.post(`/schools/${id}/archive`),
  delete: (id: string) => platformApi.delete(`/schools/${id}`),
  getDirector: (id: string) => platformApi.get(`/schools/${id}/director`),
  resetDirectorPassword: (schoolId: string, userId: string) =>
    platformApi.post(`/schools/${schoolId}/director/${userId}/reset-password`),
};
