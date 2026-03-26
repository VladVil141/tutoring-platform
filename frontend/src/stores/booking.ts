import { defineStore } from 'pinia';
import { ref } from 'vue';
import { bookingService } from '../services/api';
import { socketService } from '../services/socket';
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
  recurring_id?: string;
  recurring_pattern?: string;
  recurring_end?: string;
  group_booking_id?: number;
  listing?: {
    id: number;
    subject: string;
    price: number;
    tutor: {
      id: number;
      profile: {
        first_name: string;
        last_name: string;
        avatar_url?: string;
        city?: string;
      };
    };
  };
  student?: {
    id: number;
    profile: {
      first_name: string;
      last_name: string;
      avatar_url?: string;
    };
  };
}

export const useBookingStore = defineStore('booking', () => {
  const myBookings = ref<Booking[]>([]);
  const tutorBookings = ref<Booking[]>([]);
  const currentBooking = ref<Booking | null>(null);
  const currentRecurring = ref<Booking[]>([]);
  const loading = ref(false);

  // 👇 Инициализация WebSocket слушателей
  function initWebSocketListeners() {
    // Новая заявка (для репетитора)
    socketService.on('booking:new', (data) => {
      console.log('📡 [booking] Новая заявка:', data);
      fetchTutorBookings();
      ElMessage.info(`Новая заявка от ${data.studentName}`);
    });

    // Изменение статуса заявки (для обеих сторон)
    socketService.on('booking:updated', (data) => {
      console.log('📡 [booking] Статус изменен:', data);
      fetchMyBookings();
      fetchTutorBookings();
      
      const statusText = getStatusText(data.status);
      ElMessage.info(`Статус заявки #${data.id}: ${statusText}`);
    });

    // Обновление календаря
    socketService.on('calendar:updated', (data) => {
      console.log('📡 [booking] Календарь обновлен:', data);
    });
  }

  function getStatusText(status: string): string {
    const map: Record<string, string> = {
      pending: 'ожидает',
      confirmed: 'подтверждена',
      cancelled: 'отменена',
      completed: 'завершена',
    };
    return map[status] || status;
  }

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

  async function createRecurring(data: any) {
    try {
      loading.value = true;
      const response = await bookingService.createRecurring(data);
      ElMessage.success(`Создано ${response.data.length} занятий`);
      return response.data;
    } catch (error: any) {
      ElMessage.error(error.response?.data?.message || 'Ошибка создания расписания');
      return null;
    } finally {
      loading.value = false;
    }
  }

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

  async function fetchBooking(id: number) {
    try {
      loading.value = true;
      const response = await bookingService.getOne(id);
      return response.data;
    } catch (error: any) {
      ElMessage.error('Ошибка загрузки заявки');
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function fetchRecurring(recurringId: string) {
    try {
      loading.value = true;
      const response = await bookingService.getRecurring(recurringId);
      currentRecurring.value = response.data;
      return response.data;
    } catch (error: any) {
      ElMessage.error('Ошибка загрузки серии');
      return [];
    } finally {
      loading.value = false;
    }
  }

  async function fetchGroupSeries(groupListingId: number) {
    try {
      loading.value = true;
      const response = await bookingService.getGroupSeries(groupListingId);
      return response.data;
    } catch (error: any) {
      ElMessage.error('Ошибка загрузки расписания');
      return [];
    } finally {
      loading.value = false;
    }
  }

  async function fetchGroupSeriesForTutor(groupListingId: number) {
    try {
      loading.value = true;
      const response = await bookingService.getGroupSeriesForTutor(groupListingId);
      return response.data;
    } catch (error: any) {
      ElMessage.error('Ошибка загрузки расписания');
      return [];
    } finally {
      loading.value = false;
    }
  }

  async function cancelRecurring(recurringId: string) {
    try {
      loading.value = true;
      await bookingService.cancelRecurring(recurringId);
      ElMessage.success('Серия отменена');
      return true;
    } catch (error: any) {
      ElMessage.error(error.response?.data?.message || 'Ошибка отмены');
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function confirmBooking(id: number) {
    try {
      loading.value = true;
      const response = await bookingService.confirm(id);
      
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

  async function cancelBooking(id: number, role: 'student' | 'tutor') {
    try {
      loading.value = true;
      const response = await bookingService.cancel(id);
      
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
    currentRecurring,
    loading,
    initWebSocketListeners,
    createBooking,
    createRecurring,
    fetchMyBookings,
    fetchTutorBookings,
    fetchBooking,
    fetchRecurring,
    fetchGroupSeries,
    fetchGroupSeriesForTutor,
    cancelRecurring,
    confirmBooking,
    cancelBooking,
    completeBooking,
    checkAvailability,
  };
});