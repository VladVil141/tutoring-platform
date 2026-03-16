import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authService, userService } from '../services/api';
import type { User, LoginRequest, RegisterRequest } from '../types';
import { ElMessage } from 'element-plus';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(JSON.parse(localStorage.getItem('user') || 'null'));
  const token = ref<string | null>(localStorage.getItem('token'));
  const loading = ref(false);
  const profile = ref<any>(null); // Добавляем profile

  const isAuthenticated = computed(() => !!token.value);
  const isTutor = computed(() => user.value?.role === 'tutor');
  const isStudent = computed(() => user.value?.role === 'student');

  async function register(data: RegisterRequest) {
    try {
      loading.value = true;
      await authService.register(data);
      ElMessage.success('Регистрация успешна! Теперь войдите в систему');
      return true;
    } catch (error: any) {
      ElMessage.error(error.response?.data?.message || 'Ошибка регистрации');
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function login(data: LoginRequest) {
    try {
      loading.value = true;
      const response = await authService.login(data);
      
      token.value = response.data.access_token;
      user.value = response.data.user;
      
      localStorage.setItem('token', token.value);
      localStorage.setItem('user', JSON.stringify(user.value));
      
      // Загружаем профиль после входа
      await fetchProfile();
      
      ElMessage.success('Вход выполнен успешно');
      return true;
    } catch (error: any) {
      ElMessage.error(error.response?.data?.message || 'Ошибка входа');
      return false;
    } finally {
      loading.value = false;
    }
  }

  // Новый метод: загрузка профиля
  async function fetchProfile() {
    try {
      const response = await userService.getMe();
      profile.value = response.data;
      return response.data;
    } catch (error) {
      console.error('Ошибка загрузки профиля:', error);
      return null;
    }
  }

  // Новый метод: обновление профиля
  async function updateProfile(data: any) {
  try {
      loading.value = true;
      // ✅ Убираем is_public из данных
      const { is_public, ...cleanData } = data; // если вдруг осталось
      const response = await userService.updateProfile(cleanData);
      profile.value = response.data;
      ElMessage.success('Профиль обновлен');
      return true;
    } catch (error: any) {
      ElMessage.error(error.response?.data?.message || 'Ошибка обновления профиля');
      return false;
    } finally {
      loading.value = false;
    }
  }

  function logout() {
    token.value = null;
    user.value = null;
    profile.value = null; // Очищаем profile
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    ElMessage.success('Выход выполнен');
  }

  return {
    user,
    token,
    profile, // Добавляем в возвращаемые значения
    loading,
    isAuthenticated,
    isTutor,
    isStudent,
    register,
    login,
    logout,
    fetchProfile, // Добавляем метод
    updateProfile // Добавляем метод
  };
});