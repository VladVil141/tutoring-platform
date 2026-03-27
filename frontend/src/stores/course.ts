import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '../services/api';
import { ElMessage } from 'element-plus';

export interface Course {
  id: number;
  title: string;
  description?: string;
  tutor_id: number;
  tutor?: {
    id: number;
    profile?: {
      first_name: string;
      last_name: string;
      avatar_url?: string;
    };
  };
  invite_token: string;
  is_active: boolean;
  created_at: string;
  sections?: any[];
  enrollments?: any[];
}

export const useCourseStore = defineStore('course', () => {
  const myCourses = ref<any[]>([]);
  const currentCourse = ref<Course | null>(null);
  const loading = ref(false);

  async function fetchMyCourses() {
    try {
      loading.value = true;
      const response = await api.get('/courses/my');
      console.log('My courses response:', response.data);
      
      // Обработка ответа для ученика (enrollments) и репетитора (courses)
      if (Array.isArray(response.data)) {
        // Репетитор: массив курсов
        myCourses.value = response.data;
      } else if (response.data && Array.isArray(response.data.enrollments)) {
        // Ученик: объект с enrollments
        myCourses.value = response.data.enrollments.map((e: any) => ({
          ...e.course,
          enrollment_id: e.id,
          enrolled_at: e.enrolled_at,
          is_active: e.is_active
        }));
      } else if (response.data && Array.isArray(response.data)) {
        myCourses.value = response.data;
      } else {
        myCourses.value = [];
      }
      
      return myCourses.value;
    } catch (error) {
      console.error('Error fetching courses:', error);
      ElMessage.error('Ошибка загрузки курсов');
      return [];
    } finally {
      loading.value = false;
    }
  }

  async function fetchCourse(id: number) {
    try {
      loading.value = true;
      const response = await api.get(`/courses/${id}`);
      currentCourse.value = response.data;
      return response.data;
    } catch (error) {
      ElMessage.error('Ошибка загрузки курса');
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function createCourse(data: { title: string; description?: string }) {
    try {
      loading.value = true;
      const response = await api.post('/courses', data);
      ElMessage.success('Курс создан');
      await fetchMyCourses();
      return response.data;
    } catch (error: any) {
      ElMessage.error(error.response?.data?.message || 'Ошибка создания курса');
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function deleteCourse(id: number) {
    try {
      loading.value = true;
      await api.delete(`/courses/${id}`);
      ElMessage.success('Курс удален');
      await fetchMyCourses();
      return true;
    } catch (error: any) {
      ElMessage.error(error.response?.data?.message || 'Ошибка удаления курса');
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function createSection(courseId: number, data: { title: string; type: string }) {
    try {
      loading.value = true;
      const response = await api.post(`/courses/${courseId}/sections`, data);
      ElMessage.success('Секция создана');
      await fetchCourse(courseId);
      return response.data;
    } catch (error: any) {
      ElMessage.error(error.response?.data?.message || 'Ошибка создания секции');
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function deleteSection(sectionId: number, courseId: number) {
    try {
      loading.value = true;
      await api.delete(`/courses/sections/${sectionId}`);
      ElMessage.success('Секция удалена');
      await fetchCourse(courseId);
      return true;
    } catch (error: any) {
      ElMessage.error(error.response?.data?.message || 'Ошибка удаления секции');
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function joinCourse(token: string) {
    try {
      loading.value = true;
      const response = await api.post('/courses/join', { token });
      ElMessage.success('Вы записаны на курс');
      await fetchMyCourses();
      return response.data;
    } catch (error: any) {
      console.error('Join error:', error.response?.data);
      
      // Если уже записан
      if (error.response?.data?.message?.includes('уже записаны')) {
        ElMessage.info('Вы уже записаны на этот курс');
        return { success: false, course: error.response?.data?.course };
      }
      
      ElMessage.error(error.response?.data?.message || 'Ошибка записи на курс');
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function getInviteLink(courseId: number) {
    try {
      const response = await api.post(`/courses/${courseId}/invite`);
      return response.data.link;
    } catch (error) {
      ElMessage.error('Ошибка генерации ссылки');
      return null;
    }
  }

  return {
    myCourses,
    currentCourse,
    loading,
    fetchMyCourses,
    fetchCourse,
    createCourse,
    deleteCourse,
    createSection,
    deleteSection,
    joinCourse,
    getInviteLink,
  };
});