<template>
  <div>
    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <!-- Вкладка профиля -->
      <el-tab-pane label="Мой профиль" name="profile">
        <el-card style="max-width: 800px; margin: 20px auto;" v-if="userProfile">
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <h2>Профиль</h2>
              <el-button type="primary" @click="editMode = !editMode">
                {{ editMode ? 'Отмена' : 'Редактировать' }}
              </el-button>
            </div>
          </template>

          <!-- Режим просмотра -->
          <div v-if="!editMode">
            <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 30px;">
              <el-avatar :size="80" :src="userProfile.avatar_url" style="background: #2c3e50;">
                {{ userProfile.first_name?.charAt(0) || '' }}{{ userProfile.last_name?.charAt(0) || '' }}
              </el-avatar>
              <div>
                <h3>{{ userProfile.first_name }} {{ userProfile.last_name }}</h3>
                <p style="color: #666;">{{ authStore.user?.email }}</p>
                <el-tag :type="authStore.isTutor ? 'success' : 'info'" size="small">
                  {{ authStore.isTutor ? 'Репетитор' : 'Ученик' }}
                </el-tag>
              </div>
            </div>

            <el-descriptions :column="1" border>
              <el-descriptions-item label="Телефон">{{ userProfile.phone || 'Не указан' }}</el-descriptions-item>
              <el-descriptions-item label="Город">{{ userProfile.city || 'Не указан' }}</el-descriptions-item>
              <el-descriptions-item label="О себе">{{ userProfile.bio || 'Нет информации' }}</el-descriptions-item>
              
              <!-- Дополнительные поля для репетитора (берутся из tutor_profile) -->
              <template v-if="authStore.isTutor">
                <el-descriptions-item label="Образование">
                  {{ userProfile.tutor_profile?.education || 'Не указано' }}
                </el-descriptions-item>
                <el-descriptions-item label="Опыт">
                  {{ userProfile.tutor_profile?.experience || 'Не указан' }}
                </el-descriptions-item>
              </template>
            </el-descriptions>
          </div>

          <!-- Режим редактирования -->
          <div v-else>
            <el-form :model="editForm" label-width="120px">
              <el-form-item label="Имя">
                <el-input v-model="editForm.first_name" />
              </el-form-item>
              
              <el-form-item label="Фамилия">
                <el-input v-model="editForm.last_name" />
              </el-form-item>
              
              <el-form-item label="Телефон">
                <el-input v-model="editForm.phone" />
              </el-form-item>
              
              <el-form-item label="Город">
                <el-input v-model="editForm.city" />
              </el-form-item>
              
              <el-form-item label="О себе">
                <el-input v-model="editForm.bio" type="textarea" :rows="3" />
              </el-form-item>
              
              <!-- Поля для репетитора -->
              <template v-if="authStore.isTutor">
                <el-form-item label="Образование">
                  <el-input v-model="editForm.education" type="textarea" :rows="2" />
                </el-form-item>
                
                <el-form-item label="Опыт">
                  <el-input v-model="editForm.experience" type="textarea" :rows="2" />
                </el-form-item>
              </template>
              
              <el-form-item>
                <el-button type="primary" @click="saveProfile" :loading="authStore.loading">
                  Сохранить
                </el-button>
                <el-button @click="editMode = false">Отмена</el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- Вкладка для репетитора: Мои объявления -->
      <el-tab-pane v-if="authStore.isTutor" label="Мои объявления" name="listings">
        <el-card>
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <h2>Мои объявления</h2>
              <el-button type="primary" @click="$router.push('/listings/new')">
                + Создать объявление
              </el-button>
            </div>
          </template>
          
          <!-- Список объявлений -->
          <div v-if="listingStore.myListings.length > 0">
            <el-table :data="listingStore.myListings" style="width: 100%" v-loading="listingStore.loading">
              <el-table-column prop="subject" label="Предмет" width="150" />
              <el-table-column prop="price" label="Цена (₽/час)" width="120">
                <template #default="{ row }">
                  {{ Number(row.price).toLocaleString() }} ₽
                </template>
              </el-table-column>
              <el-table-column prop="level" label="Уровень" width="120">
                <template #default="{ row }">
                  <el-tag size="small">{{ formatLevel(row.level) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="format" label="Формат" width="100">
                <template #default="{ row }">
                  {{ formatFormat(row.format) }}
                </template>
              </el-table-column>
              <el-table-column prop="description" label="Описание" min-width="200" show-overflow-tooltip />
              <el-table-column label="Действия" width="220" fixed="right">
                <template #default="{ row }">
                  <div style="display: flex; gap: 1px;">
                    <el-button size="small" @click="$router.push(`/listings/${row.id}/edit`)">
                      Редактировать
                    </el-button>
                    <el-button size="small" type="danger" @click="handleDelete(row.id)">
                      Удалить
                    </el-button>
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </div>
          
          <el-empty v-else description="У вас пока нет объявлений" />
        </el-card>
      </el-tab-pane>

      <!-- Вкладка для репетитора: Заявки ко мне (Этап 3) -->
      <el-tab-pane v-if="authStore.isTutor" label="Заявки ко мне" name="requests">
        <el-card>
          <template #header>
            <h2>Заявки на занятия</h2>
          </template>
          <el-empty description="Функция будет доступна в Этапе 3" />
        </el-card>
      </el-tab-pane>

      <!-- Вкладка для ученика: Мои заявки (Этап 3) -->
      <el-tab-pane v-if="authStore.isStudent" label="Мои заявки" name="bookings">
        <el-card>
          <template #header>
            <h2>Мои заявки</h2>
          </template>
          <el-empty description="Функция будет доступна в Этапе 3" />
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useListingStore } from '../stores/listing';
import { ElMessage, ElMessageBox } from 'element-plus';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const listingStore = useListingStore();

const activeTab = ref('profile');
const editMode = ref(false);

const userProfile = computed(() => authStore.profile?.profile || null);

const editForm = ref({
  first_name: '',
  last_name: '',
  phone: '',
  city: '',
  bio: '',
  education: '',
  experience: ''
});

// Следим за изменением таба
const handleTabChange = (tab: string) => {
  if (tab === 'listings' && authStore.isTutor) {
    listingStore.fetchMyListings();
  }
};

// Загружаем данные при монтировании
onMounted(async () => {
  if (!authStore.isAuthenticated) {
    router.push('/login');
    return;
  }
  
  await authStore.fetchProfile();
  updateEditForm();
  
  // Если в URL есть параметр tab=listings, переключаемся
  if (route.query.tab === 'listings') {
    activeTab.value = 'listings';
    if (authStore.isTutor) {
      listingStore.fetchMyListings();
    }
  }
});

function updateEditForm() {
  const profileData = authStore.profile?.profile;
  const tutorData = authStore.profile?.profile?.tutor_profile;
  
  if (profileData) {
    editForm.value = {
      first_name: profileData.first_name || '',
      last_name: profileData.last_name || '',
      phone: profileData.phone || '',
      city: profileData.city || '',
      bio: profileData.bio || '',
      education: tutorData?.education || '',
      experience: tutorData?.experience || ''
    };
  }
}

async function saveProfile() {
  const success = await authStore.updateProfile(editForm.value);
  if (success) {
    editMode.value = false;
    await authStore.fetchProfile();
    updateEditForm();
  }
}

function formatLevel(level: string) {
  const map: Record<string, string> = {
    school: 'Школа',
    university: 'Университет',
    any: 'Любой'
  };
  return map[level] || level;
}

function formatFormat(format: string) {
  const map: Record<string, string> = {
    online: 'Онлайн',
    offline: 'Офлайн',
    any: 'Любой'
  };
  return map[format] || format;
}

async function handleDelete(id: number) {
  try {
    await ElMessageBox.confirm('Вы уверены, что хотите удалить это объявление?', 'Подтверждение', {
      confirmButtonText: 'Удалить',
      cancelButtonText: 'Отмена',
      type: 'warning',
    });
    
    await listingStore.deleteListing(id);
  } catch (error) {
    // Пользователь отменил удаление
  }
}
</script>

<style scoped>
:deep(.el-descriptions__label) {
  width: 150px;
}
</style>