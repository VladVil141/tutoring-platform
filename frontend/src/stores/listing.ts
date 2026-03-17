import { defineStore } from 'pinia';
import { ref } from 'vue';
import { listingService } from '../services/api';
import { ElMessage } from 'element-plus';
import { useAuthStore } from './auth';

export interface Listing {
  id: number;
  subject: string;
  price: number;
  description: string;
  level: 'school' | 'university' | 'any';
  format: 'online' | 'offline' | 'any';
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
      education?: string | null;  
      experience?: string | null;   
    };
  };
}

export const useListingStore = defineStore('listing', () => {
  const listings = ref<Listing[]>([]);
  const myListings = ref<Listing[]>([]);
  const currentListing = ref<Listing | null>(null);
  const loading = ref(false);
  const total = ref(0);

  // Получить все объявления (каталог)
  async function fetchListings(params?: any) {
    try {
      loading.value = true;
      const response = await listingService.getAll(params);
      listings.value = response.data;
      return response.data;
    } catch (error: any) {
      ElMessage.error('Ошибка загрузки объявлений');
      return [];
    } finally {
      loading.value = false;
    }
  }

  // Получить мои объявления (для репетитора)
  async function fetchMyListings() {
    try {
      loading.value = true;
      const response = await listingService.getMyListings();
      myListings.value = response.data;
      return response.data;
    } catch (error: any) {
      ElMessage.error('Ошибка загрузки ваших объявлений');
      return [];
    } finally {
      loading.value = false;
    }
  }

  // Получить одно объявление
  async function fetchListing(id: number) {
    try {
      loading.value = true;
      const response = await listingService.getOne(id);
      currentListing.value = response.data;
      return response.data;
    } catch (error: any) {
      ElMessage.error('Объявление не найдено');
      return null;
    } finally {
      loading.value = false;
    }
  }

  // Создать объявление
  async function createListing(data: any) {
    const authStore = useAuthStore();
    
    try {
      loading.value = true;
      const response = await listingService.create(data);
      myListings.value.unshift(response.data);
      ElMessage.success('Объявление создано');
      return response.data;
    } catch (error: any) {
      ElMessage.error(error.response?.data?.message || 'Ошибка создания объявления');
      return null;
    } finally {
      loading.value = false;
    }
  }

  // Обновить объявление
  async function updateListing(id: number, data: any) {
    try {
      loading.value = true;
      const response = await listingService.update(id, data);
      
      // Обновляем в списках
      const index = myListings.value.findIndex(item => item.id === id);
      if (index !== -1) {
        myListings.value[index] = response.data;
      }
      
      if (currentListing.value?.id === id) {
        currentListing.value = response.data;
      }
      
      ElMessage.success('Объявление обновлено');
      return response.data;
    } catch (error: any) {
      ElMessage.error(error.response?.data?.message || 'Ошибка обновления');
      return null;
    } finally {
      loading.value = false;
    }
  }

  // Удалить объявление
  async function deleteListing(id: number) {
    try {
      loading.value = true;
      await listingService.delete(id);
      
      // Удаляем из списков
      myListings.value = myListings.value.filter(item => item.id !== id);
      listings.value = listings.value.filter(item => item.id !== id);
      
      if (currentListing.value?.id === id) {
        currentListing.value = null;
      }
      
      ElMessage.success('Объявление удалено');
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
    total,
    fetchListings,
    fetchMyListings,
    fetchListing,
    createListing,
    updateListing,
    deleteListing,
  };
});