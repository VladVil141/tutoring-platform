import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type { LoginRequest, RegisterRequest, LoginResponse, Profile, TutorProfile, ApiError } from '../types';

const api: AxiosInstance = axios.create({
  baseURL: 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor для добавления токена
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor для обработки ошибок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  register: (data: RegisterRequest) => api.post('/auth/register', data),
  login: (data: LoginRequest) => api.post<LoginResponse>('/auth/login', data),
};

export const userService = {
  getMe: () => api.get('/users/me'),
  getPublicProfile: (id: number) => api.get(`/users/profile/${id}`),
  updateProfile: (data: Partial<Profile & TutorProfile>) => api.put('/users/profile', data),
};

export const listingService = {
  // Создать объявление
  create: (data: any) => api.post('/listings', data),
  
  // Получить все объявления (с фильтрами)
  getAll: (params?: any) => api.get('/listings', { params }),
  
  // Получить одно объявление
  getOne: (id: number) => api.get(`/listings/${id}`),
  
  // Получить мои объявления (для репетитора)
  getMyListings: () => api.get('/listings/my/listings'),
  
  // Обновить объявление
  update: (id: number, data: any) => api.put(`/listings/${id}`, data),
  
  // Удалить объявление
  delete: (id: number) => api.delete(`/listings/${id}`),
};

export default api;