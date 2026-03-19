import { defineStore } from 'pinia';
import { ref } from 'vue';
import { bookingService } from '../services/api';
import { ElMessage } from 'element-plus';

export interface Booking {
  id: number;
  student_id: number;
  tutor_id: number;
  listing_id: number;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  created_at: string;
  listing?: {
    id: number;
    subject: string;
    price: number;
    tutor: {
      id: number;
      profile: {
        first_name: string;
        last_name: string;
      };
    };
  };
  student?: {
    id: number;
    profile: {
      first_name: string;
      last_name: string;
    };
  };
}

export const useBookingStore = defineStore('booking', () => {
  const myBookings = ref<Booking[]>([]);
  const tutorBookings = ref<Booking[]>([]);
  const currentBooking = ref<Booking | null>(null);
  const loading = ref(false);

  // Создать заявку
  async function createBooking(data: any) {
    try {
      loading.value = true;
      const response = await bookingService.create(data);
      ElMessage.success('Заявка отправлена! Ожидайте подтверждения');
      return response.data;
    } catch (error: any) {
      ElMessage.error(error.response?.data?.message || 'Ошибка создания заявки');
      return null;
    } finally {
      loading.value = false;
    }
  }

  // Получить мои заявки (ученик)
  async function fetchMyBookings(params?: any) {
    try {
      loading.value = true;
      const response = await bookingService.getMyBookings(params);
      myBookings.value = response.data;
      return response.data;
    } catch (error: any) {
      ElMessage.error('Ошибка загрузки заявок');
      return [];
    } finally {
      loading.value = false;
    }
  }

  // Получить заявки ко мне (репетитор)
  async function fetchTutorBookings(params?: any) {
    try {
      loading.value = true;
      const response = await bookingService.getTutorBookings(params);
      tutorBookings.value = response.data;
      return response.data;
    } catch (error: any) {
      ElMessage.error('Ошибка загрузки заявок');
      return [];
    } finally {
      loading.value = false;
    }
  }

  // Подтвердить заявку
  async function confirmBooking(id: number) {
    try {
      loading.value = true;
      const response = await bookingService.confirm(id);
      
      // Обновляем в списках
      const index = tutorBookings.value.findIndex(b => b.id === id);
      if (index !== -1) tutorBookings.value[index] = response.data;
      
      ElMessage.success('Заявка подтверждена');
      return response.data;
    } catch (error: any) {
      ElMessage.error(error.response?.data?.message || 'Ошибка подтверждения');
      return null;
    } finally {
      loading.value = false;
    }
  }

  // Отменить заявку
  async function cancelBooking(id: number, role: 'student' | 'tutor') {
    try {
      loading.value = true;
      const response = await bookingService.cancel(id);
      
      // Обновляем в нужном списке
      if (role === 'student') {
        const index = myBookings.value.findIndex(b => b.id === id);
        if (index !== -1) myBookings.value[index] = response.data;
      } else {
        const index = tutorBookings.value.findIndex(b => b.id === id);
        if (index !== -1) tutorBookings.value[index] = response.data;
      }
      
      ElMessage.success('Заявка отменена');
      return response.data;
    } catch (error: any) {
      ElMessage.error(error.response?.data?.message || 'Ошибка отмены');
      return null;
    } finally {
      loading.value = false;
    }
  }

  // Отметить как выполненное
  async function completeBooking(id: number) {
    try {
      loading.value = true;
      const response = await bookingService.complete(id);
      
      const index = tutorBookings.value.findIndex(b => b.id === id);
      if (index !== -1) tutorBookings.value[index] = response.data;
      
      ElMessage.success('Занятие отмечено как выполненное');
      return response.data;
    } catch (error: any) {
      ElMessage.error(error.response?.data?.message || 'Ошибка');
      return null;
    } finally {
      loading.value = false;
    }
  }

  // Проверить доступность
  async function checkAvailability(listingId: number, date: string, time: string) {
    try {
      const response = await bookingService.checkAvailability(listingId, date, time);
      return response.data.available;
    } catch (error) {
      return false;
    }
  }

  return {
    myBookings,
    tutorBookings,
    currentBooking,
    loading,
    createBooking,
    fetchMyBookings,
    fetchTutorBookings,
    confirmBooking,
    cancelBooking,
    completeBooking,
    checkAvailability,
  };
});