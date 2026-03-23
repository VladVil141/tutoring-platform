import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

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

// 👇 НОВЫЙ ИНТЕРСЕПТОР для преобразования дат
// Преобразуем локальные даты в UTC перед отправкой
api.interceptors.request.use((config) => {
  if (config.data && (config.data.date || config.data.time)) {
    // Здесь можно добавить логику преобразования
    // Пока оставляем как есть, преобразование будет в компонентах
  }
  return config;
});

export const authService = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
};

export const userService = {
  getMe: () => api.get('/users/me'),
  getPublicProfile: (id: number) => api.get(`/users/profile/${id}`),
  updateProfile: (data: any) => api.put('/users/profile', data),
};

export const listingService = {
  create: (data: any) => api.post('/listings', data),
  getAll: (params?: any) => api.get('/listings', { params }),
  getOne: (id: number) => api.get(`/listings/${id}`),
  getMyListings: () => api.get('/listings/my/listings'),
  update: (id: number, data: any) => api.put(`/listings/${id}`, data),
  delete: (id: number) => api.delete(`/listings/${id}`),
};

export const groupListingService = {
  create: (data: any) => api.post('/group-listings', data),
  getAll: (params?: any) => api.get('/group-listings', { params }),
  getOne: (id: number) => api.get(`/group-listings/${id}`),
  getMyListings: () => api.get('/group-listings/my/listings'),
  update: (id: number, data: any) => api.put(`/group-listings/${id}`, data),
  delete: (id: number) => api.delete(`/group-listings/${id}`),
};

export const bookingService = {
  create: (data: any) => api.post('/bookings', data),
  createRecurring: (data: any) => api.post('/bookings/recurring', data),
  getMyBookings: (params?: any) => api.get('/bookings/my', { params }),
  getTutorBookings: (params?: any) => api.get('/bookings/tutor', { params }),
  getOne: (id: number) => api.get(`/bookings/${id}`),
  getRecurring: (recurringId: string) => api.get(`/bookings/recurring/${recurringId}`),
  getRecurringForTutor: (recurringId: string) => api.get(`/bookings/recurring/tutor/${recurringId}`),
  getGroupSeries: (groupListingId: number) => api.get(`/group-bookings/series/${groupListingId}`),
  getGroupSeriesForTutor: (groupListingId: number) => api.get(`/group-bookings/series/tutor/${groupListingId}`),
  confirm: (id: number) => api.put(`/bookings/${id}/confirm`),
  cancel: (id: number) => api.put(`/bookings/${id}/cancel`),
  complete: (id: number) => api.put(`/bookings/${id}/complete`),
  cancelRecurring: (recurringId: string) => api.delete(`/bookings/recurring/${recurringId}`),
  checkAvailability: (listingId: number, date: string, time: string) => 
    api.get('/bookings/check-availability', { params: { listing_id: listingId, date, time } }),
  // Переносы
  createReschedule: (data: any) => api.post('/bookings/reschedule', data),
  getPendingReschedules: () => api.get('/bookings/reschedule/pending'),
  confirmReschedule: (id: number) => api.put(`/bookings/reschedule/${id}/confirm`),
  rejectReschedule: (id: number) => api.put(`/bookings/reschedule/${id}/reject`),
};

export const groupBookingService = {
  create: (data: any) => api.post('/group-bookings', data),
  getMyBookings: (params?: any) => api.get('/group-bookings/my', { params }),
  getTutorBookings: (params?: any) => api.get('/group-bookings/tutor', { params }),
  getOne: (id: number) => api.get(`/group-bookings/${id}`),
  approve: (id: number) => api.put(`/group-bookings/${id}/approve`),
  reject: (id: number) => api.put(`/group-bookings/${id}/reject`),
  cancel: (id: number) => api.delete(`/group-bookings/${id}`),
  leaveGroup: (groupListingId: number) => api.delete(`/group-bookings/group/${groupListingId}/leave`),
};

export const scheduleService = {
  getSchedule: (params?: any) => api.get('/bookings/schedule', { params }),
};

export const attendanceService = {
  getTutorAttendances: (params?: any) => api.get('/attendances/tutor', { params }),
  getOne: (id: number) => api.get(`/attendances/${id}`),
  update: (id: number, data: any) => api.put(`/attendances/${id}`, data),
};

export const chatService = {
  // Получить все чаты
  getChats: () => api.get('/chat/chats'),
  
  // Создать личный чат
  createPrivateChat: (tutorId: number) => api.post('/chat/private', { tutor_id: tutorId }),
  
  // Получить сообщения чата
  getMessages: (type: 'private' | 'group', chatId: number, limit?: number) => 
    api.get(`/chat/${type}/${chatId}/messages`, { params: { limit } }),
  
  // Удалить личный чат
  deletePrivateChat: (chatId: number) => api.delete(`/chat/private/${chatId}`),
  
  // Удалить групповой чат у себя
  deleteGroupChat: (chatId: number) => api.delete(`/chat/group/${chatId}`),
  
  // Удалить групповой чат для всех (только репетитор)
  deleteGroupChatForAll: (chatId: number) => api.delete(`/chat/group/${chatId}/all`),
};

export default api;