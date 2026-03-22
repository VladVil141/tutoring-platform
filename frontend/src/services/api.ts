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

export const groupListingService = {
  // Создать групповое объявление
  create: (data: any) => api.post('/group-listings', data),
  
  // Получить все групповые объявления (с фильтрами)
  getAll: (params?: any) => api.get('/group-listings', { params }),
  
  // Получить одно групповое объявление
  getOne: (id: number) => api.get(`/group-listings/${id}`),
  
  // Получить мои групповые объявления
  getMyListings: () => api.get('/group-listings/my/listings'),
  
  // Обновить групповое объявление
  update: (id: number, data: any) => api.put(`/group-listings/${id}`, data),
  
  // Удалить групповое объявление
  delete: (id: number) => api.delete(`/group-listings/${id}`),
};

export const bookingService = {
  // Создать разовую заявку
  create: (data: any) => api.post('/bookings', data),
  
  // Создать регулярные занятия
  createRecurring: (data: any) => api.post('/bookings/recurring', data),
  
  // Мои заявки (ученик)
  getMyBookings: (params?: any) => api.get('/bookings/my', { params }),
  
  // Заявки ко мне (репетитор)
  getTutorBookings: (params?: any) => api.get('/bookings/tutor', { params }),
  
  // Получить одну заявку
  getOne: (id: number) => api.get(`/bookings/${id}`),
  
  // Получить серию (регулярные)
  getRecurring: (recurringId: string) => api.get(`/bookings/recurring/${recurringId}`),
  
  // Получить серию групповых занятий
  getGroupSeries: (groupListingId: number) => api.get(`/group-bookings/series/${groupListingId}`),
  // Получить серию групповых занятий для репетитора
getGroupSeriesForTutor: (groupListingId: number) => api.get(`/group-bookings/series/tutor/${groupListingId}`),
  
  // Подтвердить заявку
  confirm: (id: number) => api.put(`/bookings/${id}/confirm`),
  
  // Отменить заявку
  cancel: (id: number) => api.put(`/bookings/${id}/cancel`),
  
  // Отметить как выполненное
  complete: (id: number) => api.put(`/bookings/${id}/complete`),
  
  // Отменить серию
  cancelRecurring: (recurringId: string) => api.delete(`/bookings/recurring/${recurringId}`),
  
  // Проверить доступность
  checkAvailability: (listingId: number, date: string, time: string) => 
    api.get('/bookings/check-availability', { params: { listing_id: listingId, date, time } }),
};

export const groupBookingService = {
  // Создать заявку в группу
  create: (data: any) => api.post('/group-bookings', data),
  
  // Мои заявки в группы (ученик)
  getMyBookings: (params?: any) => api.get('/group-bookings/my', { params }),
  
  // Заявки ко мне (репетитор)
  getTutorBookings: (params?: any) => api.get('/group-bookings/tutor', { params }),
  
  // Получить одну заявку
  getOne: (id: number) => api.get(`/group-bookings/${id}`),
  
  // Одобрить заявку
  approve: (id: number) => api.put(`/group-bookings/${id}/approve`),
  
  // Отклонить заявку
  reject: (id: number) => api.put(`/group-bookings/${id}/reject`),
  
  // Отменить свою заявку
  cancel: (id: number) => api.delete(`/group-bookings/${id}`),
  
  // Выйти из группы
  leaveGroup: (groupListingId: number) => api.delete(`/group-bookings/group/${groupListingId}/leave`),
};

export const scheduleService = {
  // Получить расписание
  getSchedule: (params?: any) => api.get('/bookings/schedule', { params }),
};

export default api;