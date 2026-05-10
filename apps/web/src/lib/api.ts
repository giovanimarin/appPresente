import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

if (typeof window !== 'undefined') {
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const original = error.config;
      if (error.response?.status === 401 && !original._retry) {
        original._retry = true;
        const refreshToken = localStorage.getItem('refreshToken');
        const storedUser = localStorage.getItem('user');
        const userId = storedUser ? JSON.parse(storedUser).id : null;
        if (refreshToken && userId) {
          try {
            const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken, userId });
            const { accessToken, refreshToken: newRefreshToken } = res.data;
            localStorage.setItem('accessToken', accessToken);
            if (newRefreshToken) localStorage.setItem('refreshToken', newRefreshToken);
            original.headers.Authorization = `Bearer ${accessToken}`;
            return api(original);
          } catch {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
          }
        }
      }
      return Promise.reject(error);
    },
  );
}

// Auth
export const authApi = {
  login: (email: string, password: string) => api.post('/auth/staff/login', { email, password }),
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
  me: () => api.get('/auth/me'),
  updateMe: (data: { name?: string; email?: string; currentPassword?: string; newPassword?: string }) =>
    api.put('/auth/me', data),
  requestOtp: (email: string) => api.post('/auth/guardian/request-otp', { email }),
  verifyOtp: (email: string, code: string) => api.post('/auth/guardian/verify-otp', { email, code }),
  guardianLogin: (email: string, password: string) => api.post('/auth/guardian/login', { email, password }),
  guardianSetPassword: (data: { currentPassword?: string; newPassword: string }) => api.post('/auth/guardian/set-password', data),
};

// Schools
export const schoolsApi = {
  get: () => api.get('/schools/me'),
  update: (data: unknown) => api.put('/schools/me', data),
  stats: () => api.get('/schools/me/stats'),
  requestLogoUpload: (filename: string, contentType: string) =>
    api.post('/schools/me/request-logo-upload', { filename, contentType }),
};

// Users
export const usersApi = {
  list: (params?: unknown) => api.get('/users', { params }),
  create: (data: unknown) => api.post('/users', data),
  get: (id: string) => api.get(`/users/${id}`),
  update: (id: string, data: unknown) => api.put(`/users/${id}`, data),
  archive: (id: string) => api.post(`/users/${id}/archive`),
  reactivate: (id: string) => api.post(`/users/${id}/reactivate`),
  deletePermanent: (id: string) => api.delete(`/users/${id}/permanent`),
};

// Classes
export const classesApi = {
  list: (params?: unknown) => api.get('/classes', { params }),
  create: (data: unknown) => api.post('/classes', data),
  get: (id: string) => api.get(`/classes/${id}`),
  update: (id: string, data: unknown) => api.put(`/classes/${id}`, data),
  archive: (id: string) => api.post(`/classes/${id}/archive`),
  reactivate: (id: string) => api.post(`/classes/${id}/reactivate`),
  deletePermanent: (id: string) => api.delete(`/classes/${id}/permanent`),
  students: (id: string) => api.get(`/classes/${id}/students`),
  addTeacher: (classId: string, data: unknown) => api.post(`/classes/${classId}/teachers`, data),
  removeTeacher: (classId: string, teacherId: string) => api.delete(`/classes/${classId}/teachers/${teacherId}`),
};

// Students
export const studentsApi = {
  list: (params?: unknown) => api.get('/students', { params }),
  create: (data: unknown) => api.post('/students', data),
  get: (id: string) => api.get(`/students/${id}`),
  update: (id: string, data: unknown) => api.put(`/students/${id}`, data),
  archive: (id: string) => api.post(`/students/${id}/archive`),
  reactivate: (id: string) => api.post(`/students/${id}/reactivate`),
  deletePermanent: (id: string) => api.delete(`/students/${id}/permanent`),
  guardians: (id: string) => api.get(`/students/${id}/guardians`),
  linkGuardian: (id: string, data: unknown) => api.post(`/students/${id}/guardians`, data),
  unlinkGuardian: (id: string, guardianId: string) => api.delete(`/students/${id}/guardians/${guardianId}`),
  import: (rows: unknown[]) => api.post('/students/import', { rows }),
};

// Guardians
export const guardiansApi = {
  // Staff
  list: (params?: unknown) => api.get('/guardians', { params }),
  create: (data: unknown) => api.post('/guardians', data),
  get: (id: string) => api.get(`/guardians/${id}`),
  update: (id: string, data: unknown) => api.put(`/guardians/${id}`, data),
  listPending: () => api.get('/guardians/pending'),
  resendInvite: (id: string) => api.post(`/guardians/${id}/resend-invite`),
  approveLink: (token: string) => api.post(`/guardians/link/${token}/approve`),
  archive: (id: string) => api.post(`/guardians/${id}/archive`),
  reactivate: (id: string) => api.post(`/guardians/${id}/reactivate`),
  deletePermanent: (id: string) => api.delete(`/guardians/${id}/permanent`),
  // Guardian self
  mySchools: () => api.get('/guardians/my-schools'),
  updateSchoolPreference: (schoolId: string, data: { color?: string; nickname?: string }) =>
    api.put(`/guardians/my-schools/${schoolId}/preference`, data),
  getMe: () => api.get('/guardians/me'),
  updateMe: (data: { name?: string; email?: string }) => api.put('/guardians/me', data),
};

// Communications
export const communicationsApi = {
  list: (params?: unknown) => api.get('/communications', { params }),
  create: (data: unknown) => api.post('/communications', data),
  get: (id: string) => api.get(`/communications/${id}`),
  send: (id: string) => api.post(`/communications/${id}/send`),
  resend: (id: string) => api.post(`/communications/${id}/resend`),
  deliver: (id: string, data: unknown) => api.post(`/communications/${id}/deliver`, data),
  cancel: (id: string) => api.post(`/communications/${id}/cancel`),
  readReport: (id: string) => api.get(`/communications/${id}/read-report`),
  guardianFeed: (schoolId?: string) =>
    api.get('/communications/guardian/feed', { params: schoolId ? { schoolId } : undefined }),
  confirmRead: (id: string, data: unknown) => api.post(`/communications/${id}/read`, data),
  createGuardianRequest: (data: unknown) => api.post('/communications/guardian', data),
  myRequests: () => api.get('/communications/guardian/my-requests'),
  listRequests: (params?: unknown) => api.get('/communications/requests', { params }),
  updateRequestStatus: (id: string, data: { status: string; note?: string }) =>
    api.patch(`/communications/requests/${id}/status`, data),
};

// Agenda
export const agendaApi = {
  list: (params?: unknown) => api.get('/agenda', { params }),
  create: (data: unknown) => api.post('/agenda', data),
  get: (id: string) => api.get(`/agenda/${id}`),
  update: (id: string, data: unknown) => api.put(`/agenda/${id}`, data),
  cancel: (id: string) => api.post(`/agenda/${id}/cancel`),
  deletePermanent: (id: string) => api.delete(`/agenda/${id}/permanent`),
  guardianFeed: (params?: unknown) => api.get('/agenda/guardian/feed', { params }),
};

// Forms
export const formsApi = {
  list: (params?: unknown) => api.get('/forms', { params }),
  create: (data: unknown) => api.post('/forms', data),
  get: (id: string) => api.get(`/forms/${id}`),
  update: (id: string, data: unknown) => api.put(`/forms/${id}`, data),
  deletePermanent: (id: string) => api.delete(`/forms/${id}/permanent`),
  submissions: (id: string, params?: unknown) => api.get(`/forms/${id}/submissions`, { params }),
  resolve: (formId: string, submissionId: string, data?: unknown) =>
    api.post(`/forms/${formId}/submissions/${submissionId}/resolve`, data),
  guardianForms: () => api.get('/forms/guardian/available'),
  submit: (id: string, data: unknown) => api.post(`/forms/guardian/${id}/submit`, data),
  mySubmissions: () => api.get('/forms/guardian/submissions'),
};

// Dashboard
export const dashboardApi = {
  stats: () => api.get('/dashboard/stats'),
  communicationReport: (params?: unknown) => api.get('/dashboard/reports/communications', { params }),
  engagementReport: () => api.get('/dashboard/reports/engagement'),
};

// Uploads
export const uploadsApi = {
  guardianRequest: (data: { filename: string; contentType: string; size: number; formId: string }) =>
    api.post('/uploads/guardian/request', data),
  request: (data: unknown) => api.post('/uploads/request', data),
  confirm: (data: unknown) => api.post('/uploads/confirm', data),
  download: (id: string) => api.get(`/uploads/${id}/download`),
  delete: (id: string) => api.delete(`/uploads/${id}`),
};

// Appointments
export const appointmentsApi = {
  // Staff
  listSlots: (params?: unknown) => api.get('/appointments/slots', { params }),
  createSlot: (data: unknown) => api.post('/appointments/slots', data),
  getSlot: (id: string) => api.get(`/appointments/slots/${id}`),
  cancelSlot: (id: string) => api.post(`/appointments/slots/${id}/cancel`),
  cancelSlotGroup: (id: string, mode: 'this' | 'future' | 'all') =>
    api.post(`/appointments/slots/${id}/cancel-group`, { mode }),
  deleteSlot: (id: string) => api.delete(`/appointments/slots/${id}`),
  staffCancelBooking: (bookingId: string) => api.post(`/appointments/bookings/${bookingId}/cancel`),
  // Guardian
  listAvailable: (params?: unknown) => api.get('/appointments/available', { params }),
  book: (data: unknown) => api.post('/appointments/book', data),
  listMyBookings: (params?: unknown) => api.get('/appointments/my-bookings', { params }),
  cancelMyBooking: (id: string) => api.post(`/appointments/my-bookings/${id}/cancel`),
};
