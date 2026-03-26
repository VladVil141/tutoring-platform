import { defineStore } from 'pinia';
import { ref } from 'vue';
import { groupBookingService } from '../services/api';
import { socketService } from '../services/socket';
import { ElMessage } from 'element-plus';

export interface GroupBooking {
  id: number;
  student_id: number;
  group_listing_id: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  group_listing?: {
    id: number;
    subject: string;
    price: number;
    schedule: string;
    min_students: number;
    max_students: number;
    current_students: number;
    tutor: {
      id: number;
      profile: {
        first_name: string;
        last_name: string;
        avatar_url: string | null;
      };
    };
  };
  student?: {
    id: number;
    profile: {
      first_name: string;
      last_name: string;
      avatar_url: string | null;
    };
  };
}

export const useGroupBookingStore = defineStore('groupBooking', () => {
  const myBookings = ref<GroupBooking[]>([]);
  const tutorBookings = ref<GroupBooking[]>([]);
  const loading = ref(false);

  // 👇 Инициализация WebSocket слушателей
  function initWebSocketListeners() {
    // Новая групповая заявка (для репетитора)
    socketService.on('group_booking:new', (data) => {
      console.log('📡 [groupBooking] Новая групповая заявка:', data);
      fetchTutorBookings();
      ElMessage.info(`Новая заявка в группу "${data.groupTitle}" от ${data.studentName}`);
    });

    // Изменение статуса групповой заявки
    socketService.on('group_booking:status_changed', (data) => {
      console.log('📡 [groupBooking] Статус изменен:', data);
      fetchMyBookings();
      fetchTutorBookings();
      
      const statusText = data.status === 'approved' ? 'одобрена' : 'отклонена';
      ElMessage.info(`Заявка в группу "${data.groupTitle}" ${statusText}`);
    });

    // Изменение состава группы
    socketService.on('group:students_changed', (data) => {
      console.log('📡 [groupBooking] Состав группы изменен:', data);
      // Обновляем списки, чтобы показать актуальное количество
      fetchMyBookings();
      fetchTutorBookings();
    });
  }

  async function createBooking(groupListingId: number) {
    try {
      loading.value = true;
      const response = await groupBookingService.create({ group_listing_id: groupListingId });
      ElMessage.success('Заявка отправлена! Ожидайте подтверждения');
      return response.data;
    } catch (error: any) {
      ElMessage.error(error.response?.data?.message || 'Ошибка подачи заявки');
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function fetchMyBookings() {
    try {
      loading.value = true;
      const response = await groupBookingService.getMyBookings();
      myBookings.value = response.data;
      return response.data;
    } catch (error) {
      ElMessage.error('Ошибка загрузки заявок');
      return [];
    } finally {
      loading.value = false;
    }
  }

  async function fetchTutorBookings() {
    try {
      loading.value = true;
      const response = await groupBookingService.getTutorBookings();
      tutorBookings.value = response.data;
      return response.data;
    } catch (error) {
      ElMessage.error('Ошибка загрузки заявок');
      return [];
    } finally {
      loading.value = false;
    }
  }

  async function approveBooking(id: number) {
    try {
      loading.value = true;
      const response = await groupBookingService.approve(id);
      
      const index = tutorBookings.value.findIndex(b => b.id === id);
      if (index !== -1) tutorBookings.value[index] = response.data;
      
      ElMessage.success('Заявка одобрена');
      return response.data;
    } catch (error: any) {
      ElMessage.error(error.response?.data?.message || 'Ошибка одобрения');
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function rejectBooking(id: number) {
    try {
      loading.value = true;
      const response = await groupBookingService.reject(id);
      
      const index = tutorBookings.value.findIndex(b => b.id === id);
      if (index !== -1) tutorBookings.value[index] = response.data;
      
      ElMessage.success('Заявка отклонена');
      return response.data;
    } catch (error: any) {
      ElMessage.error(error.response?.data?.message || 'Ошибка отклонения');
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function cancelBooking(id: number) {
    try {
      loading.value = true;
      await groupBookingService.cancel(id);
      
      myBookings.value = myBookings.value.filter(b => b.id !== id);
      
      ElMessage.success('Заявка отменена');
      return true;
    } catch (error: any) {
      ElMessage.error(error.response?.data?.message || 'Ошибка отмены');
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function leaveGroup(groupListingId: number) {
    try {
      loading.value = true;
      await groupBookingService.leaveGroup(groupListingId);
      
      await fetchMyBookings();
      
      ElMessage.success('Вы вышли из группы');
      return true;
    } catch (error: any) {
      ElMessage.error(error.response?.data?.message || 'Ошибка выхода из группы');
      return false;
    } finally {
      loading.value = false;
    }
  }

  return {
    myBookings,
    tutorBookings,
    loading,
    initWebSocketListeners,
    createBooking,
    fetchMyBookings,
    fetchTutorBookings,
    approveBooking,
    rejectBooking,
    cancelBooking,
    leaveGroup,
  };
});