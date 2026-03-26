import { defineStore } from 'pinia';
import { ref } from 'vue';
import { scheduleService } from '../services/api';
import { socketService } from '../services/socket';
import { ElMessage } from 'element-plus';

export interface ScheduleEvent {
  id: number;
  type: 'individual' | 'group';
  subject: string;
  date: string;
  time: string;
  status: string;
  student_name?: string;
  student_id?: number;
  tutor_name?: string;
  tutor_id?: number;
  group_size?: number;
  max_students?: number;
}

export const useScheduleStore = defineStore('schedule', () => {
  const events = ref<ScheduleEvent[]>([]);
  const loading = ref(false);

  // 👇 Инициализация WebSocket слушателей
  function initWebSocketListeners() {
    // Обновление календаря при изменении заявок
    socketService.on('booking:updated', () => {
      console.log('📡 [schedule] Обновляем календарь (booking:updated)');
      fetchSchedule();
    });

    socketService.on('booking:new', () => {
      console.log('📡 [schedule] Обновляем календарь (booking:new)');
      fetchSchedule();
    });

    // Обновление при переносах
    socketService.on('reschedule:status_changed', (data) => {
      console.log('📡 [schedule] Обновляем календарь (reschedule):', data);
      fetchSchedule();
    });

    // Обновление при отметке посещения
    socketService.on('attendance:marked', () => {
      console.log('📡 [schedule] Обновляем календарь (attendance:marked)');
      fetchSchedule();
    });

    // Обновление при изменении состава группы
    socketService.on('group:students_changed', () => {
      console.log('📡 [schedule] Обновляем календарь (group:students_changed)');
      fetchSchedule();
    });

    // Обновление при изменении статуса групповой заявки
    socketService.on('group_booking:status_changed', () => {
      console.log('📡 [schedule] Обновляем календарь (group_booking:status_changed)');
      fetchSchedule();
    });
  }

  async function fetchSchedule(params?: { start_date?: string; end_date?: string; view?: string }) {
    try {
      loading.value = true;
      const response = await scheduleService.getSchedule(params);
      events.value = response.data;
      return response.data;
    } catch (error: any) {
      ElMessage.error('Ошибка загрузки расписания');
      return [];
    } finally {
      loading.value = false;
    }
  }

  return {
    events,
    loading,
    initWebSocketListeners,
    fetchSchedule,
  };
});