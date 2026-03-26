import { defineStore } from 'pinia';
import { ref } from 'vue';
import { attendanceService } from '../services/api';
import { socketService } from '../services/socket';
import { useAuthStore } from './auth';  // 👈 добавить
import { ElMessage } from 'element-plus';

export interface Attendance {
  id: number;
  booking_id: number;
  student_id: number;
  tutor_id: number;
  date: string;
  time: string;
  visited: boolean;
  paid: boolean;
  notes: string | null;
  student?: {
    id: number;
    profile: {
      first_name: string;
      last_name: string;
      avatar_url: string | null;
    };
  };
  booking?: {
    listing: {
      subject: string;
    };
  };
}

export const useAttendanceStore = defineStore('attendance', () => {
  const attendances = ref<Attendance[]>([]);
  const loading = ref(false);
  const authStore = useAuthStore();  // 👈 добавить

  // 👇 Инициализация WebSocket слушателей (только для репетитора)
  function initWebSocketListeners() {
    // Проверяем, что пользователь репетитор
    if (!authStore.isTutor) {
      console.log('📡 [AttendanceStore] Пропускаем инициализацию: пользователь не репетитор');
      return;
    }

    // Отметка посещения
    socketService.on('attendance:marked', (data) => {
      console.log('📡 [AttendanceStore] Отметка посещения:', data);
      fetchAttendances();
    });

    // Изменение статуса заявки
    socketService.on('booking:updated', (data) => {
      console.log('📡 [AttendanceStore] Статус заявки изменен:', data);
      fetchAttendances();
    });

    // Перенос занятия
    socketService.on('reschedule:status_changed', (data) => {
      console.log('📡 [AttendanceStore] Перенос занятия:', data);
      if (data.status === 'confirmed') {
        fetchAttendances();
      }
    });
  }

  // Загрузить дневник
  async function fetchAttendances(params?: any) {
    // Проверяем, что пользователь репетитор
    if (!authStore.isTutor) {
      console.log('📡 [AttendanceStore] Пропускаем загрузку дневника: пользователь не репетитор');
      return [];
    }
    
    try {
      loading.value = true;
      const response = await attendanceService.getTutorAttendances(params);
      attendances.value = response.data;
      return response.data;
    } catch (error: any) {
      ElMessage.error('Ошибка загрузки дневника');
      return [];
    } finally {
      loading.value = false;
    }
  }

  // Обновить запись
  async function updateAttendance(id: number, data: any) {
    if (!authStore.isTutor) {
      ElMessage.warning('Только репетиторы могут редактировать дневник');
      return null;
    }
    
    try {
      loading.value = true;
      const response = await attendanceService.update(id, data);
      
      const index = attendances.value.findIndex(a => a.id === id);
      if (index !== -1) {
        attendances.value[index] = response.data;
      }
      
      ElMessage.success('Запись обновлена');
      return response.data;
    } catch (error: any) {
      ElMessage.error(error.response?.data?.message || 'Ошибка обновления');
      return null;
    } finally {
      loading.value = false;
    }
  }

  return {
    attendances,
    loading,
    initWebSocketListeners,
    fetchAttendances,
    updateAttendance,
  };
});