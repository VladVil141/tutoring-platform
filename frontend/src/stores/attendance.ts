import { defineStore } from 'pinia';
import { ref } from 'vue';
import { attendanceService } from '../services/api';
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

  // Загрузить дневник
  async function fetchAttendances(params?: any) {
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
    try {
      loading.value = true;
      const response = await attendanceService.update(id, data);
      
      // Обновляем в списке
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
    fetchAttendances,
    updateAttendance,
  };
});