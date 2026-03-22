import { defineStore } from 'pinia';
import { ref } from 'vue';
import { scheduleService } from '../services/api';
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

  // Загрузить расписание
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
    fetchSchedule,
  };
});