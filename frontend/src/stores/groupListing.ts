import { defineStore } from 'pinia';
import { ref } from 'vue';
import { groupListingService } from '../services/api';
import { ElMessage } from 'element-plus';

export interface GroupListing {
  id: number;
  subject: string;
  price: number;
  description: string;
  level: 'school' | 'university' | 'any';
  format: 'online' | 'offline' | 'any';
  schedule: string;
  min_students: number;
  max_students: number;
  current_students: number;
  is_active: boolean;
  created_at: string;
  tutor_id: number;
  tutor?: {
    id: number;
    email: string;
    profile: {
      first_name: string;
      last_name: string;
      avatar_url: string | null;
      city: string;
    };
  };
}

export const useGroupListingStore = defineStore('groupListing', () => {
  const listings = ref<GroupListing[]>([]);
  const myListings = ref<GroupListing[]>([]);
  const currentListing = ref<GroupListing | null>(null);
  const loading = ref(false);

  // Получить все групповые объявления (каталог)
  async function fetchListings(params?: any) {
    try {
      loading.value = true;
      const response = await groupListingService.getAll(params);
      listings.value = response.data;
      return response.data;
    } catch (error: any) {
      ElMessage.error('Ошибка загрузки групповых объявлений');
      return [];
    } finally {
      loading.value = false;
    }
  }

  // Получить мои групповые объявления
  async function fetchMyListings() {
    try {
      loading.value = true;
      const response = await groupListingService.getMyListings();
      myListings.value = response.data;
      return response.data;
    } catch (error: any) {
      ElMessage.error('Ошибка загрузки ваших групповых объявлений');
      return [];
    } finally {
      loading.value = false;
    }
  }

  // Получить одно групповое объявление
  async function fetchListing(id: number) {
    try {
      loading.value = true;
      const response = await groupListingService.getOne(id);
      currentListing.value = response.data;
      return response.data;
    } catch (error: any) {
      ElMessage.error('Групповое объявление не найдено');
      return null;
    } finally {
      loading.value = false;
    }
  }

  // Создать групповое объявление
  async function createListing(data: any) {
    try {
      loading.value = true;
      const response = await groupListingService.create(data);
      myListings.value.unshift(response.data);
      ElMessage.success('Групповое объявление создано');
      return response.data;
    } catch (error: any) {
      ElMessage.error(error.response?.data?.message || 'Ошибка создания');
      return null;
    } finally {
      loading.value = false;
    }
  }

  // Обновить групповое объявление
  async function updateListing(id: number, data: any) {
    try {
      loading.value = true;
      const response = await groupListingService.update(id, data);
      
      const index = myListings.value.findIndex(item => item.id === id);
      if (index !== -1) myListings.value[index] = response.data;
      if (currentListing.value?.id === id) currentListing.value = response.data;
      
      ElMessage.success('Групповое объявление обновлено');
      return response.data;
    } catch (error: any) {
      ElMessage.error(error.response?.data?.message || 'Ошибка обновления');
      return null;
    } finally {
      loading.value = false;
    }
  }

  // Удалить групповое объявление
  async function deleteListing(id: number) {
    try {
      loading.value = true;
      await groupListingService.delete(id);
      
      myListings.value = myListings.value.filter(item => item.id !== id);
      listings.value = listings.value.filter(item => item.id !== id);
      if (currentListing.value?.id === id) currentListing.value = null;
      
      ElMessage.success('Групповое объявление удалено');
      return true;
    } catch (error: any) {
      ElMessage.error(error.response?.data?.message || 'Ошибка удаления');
      return false;
    } finally {
      loading.value = false;
    }
  }

  return {
    listings,
    myListings,
    currentListing,
    loading,
    fetchListings,
    fetchMyListings,
    fetchListing,
    createListing,
    updateListing,
    deleteListing,
  };
});