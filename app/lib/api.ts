import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import { getAccessToken, storeTokens, getRefreshToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Create base instance
const baseInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
baseInstance.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor
baseInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${API_URL}/api/auth/refresh`, {
          refreshToken,
        });

        storeTokens(response.data.accessToken, refreshToken);
        originalRequest.headers.Authorization = `Bearer ${response.data.accessToken}`;

        return baseInstance(originalRequest);
      } catch (refreshError) {
        // Return original error if refresh fails
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export const apiClient = baseInstance;

// ==================== Authentication API ====================

export const authAPI = {
  login: (email: string, password: string, rememberMe: boolean, recaptchaToken: string) =>
    apiClient.post('/api/auth/login', {
      email,
      password,
      rememberMe,
      recaptchaToken,
    }),

  register: (username: string, email: string, password: string, confirmPassword: string, fullName: string, recaptchaToken: string) =>
    apiClient.post('/api/auth/register', {
      username,
      email,
      password,
      confirmPassword,
      fullName,
      recaptchaToken,
    }),

  refresh: (refreshToken: string) =>
    apiClient.post('/api/auth/refresh', { refreshToken }),

  forgotPassword: (email: string) =>
    apiClient.post('/api/auth/forgot-password', { email }),

  health: () =>
    apiClient.get('/api/health'),

  dbHealth: () =>
    apiClient.get('/api/db-health'),
};

// ==================== Employees API ====================

export const employeesAPI = {
  list: (page: number = 1, limit: number = 10, search: string = '', division: string = '', status: string = '') =>
    apiClient.get('/api/employees', {
      params: { page, limit, search, division, status },
    }),

  get: (id: number) =>
    apiClient.get(`/api/employees/${id}`),

  create: (formData: FormData) =>
    apiClient.post('/api/employees', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  update: (id: number, formData: FormData) =>
    apiClient.put(`/api/employees/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  delete: (id: number) =>
    apiClient.delete(`/api/employees/${id}`),

  bulkImport: (employees: any[]) =>
    apiClient.post('/api/employees/bulk-import', { employees }),
};

// ==================== Users API ====================

export const usersAPI = {
  list: (page: number = 1, limit: number = 10, search: string = '', role: string = '') =>
    apiClient.get('/api/users', {
      params: { page, limit, search, role },
    }),

  update: (id: number, data: any) =>
    apiClient.put(`/api/users/${id}`, data),

  delete: (id: number) =>
    apiClient.delete(`/api/users/${id}`),
};

// ==================== Dashboard API ====================

export const dashboardAPI = {
  stats: () =>
    apiClient.get('/api/dashboard/stats'),

  growth: () =>
    apiClient.get('/api/dashboard/growth'),

  divisions: () =>
    apiClient.get('/api/dashboard/divisions'),

  recent: () =>
    apiClient.get('/api/dashboard/recent'),
};

// ==================== File API ====================

export const fileAPI = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/api/upload/file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  export: (format: string = 'excel', division: string = '', status: string = '') =>
    apiClient.get('/api/export/employees', {
      params: { format, division, status },
    }),
};

// ==================== Error Handler ====================

export const handleApiError = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.message) {
    return error.message;
  }

  return 'An error occurred. Please try again.';
};

export default apiClient;
