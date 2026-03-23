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
              
              <!-- Дополнительные поля для репетитора -->
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
              <div>
                <el-button type="primary" @click="$router.push('/listings/new')">
                  + Индивидуальное
                </el-button>
                <el-button type="warning" @click="$router.push('/group-listings/new')">
                  + Групповое
                </el-button>
              </div>
            </div>
          </template>
          
          <!-- Фильтр по типу -->
          <div style="margin-bottom: 20px;">
            <el-radio-group v-model="listingFilter" @change="loadMyListings">
              <el-radio value="all">Все</el-radio>
              <el-radio value="individual">Индивидуальные</el-radio>
              <el-radio value="group">Групповые</el-radio>
            </el-radio-group>
          </div>
          
          <!-- Список объявлений -->
          <div v-if="filteredListings.length > 0">
            <el-table :data="filteredListings" style="width: 100%" v-loading="loading">
              <el-table-column prop="id" label="ID" width="60" />
              <el-table-column prop="subject" label="Предмет" width="150" />
              <el-table-column label="Тип" width="100">
                <template #default="{ row }">
                  <el-tag :type="row.type === 'group' ? 'warning' : 'primary'" size="small">
                    {{ row.type === 'group' ? 'Групповое' : 'Индивидуальное' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="price" label="Цена (₽/час)" width="120">
                <template #default="{ row }">
                  {{ Number(row.price).toLocaleString() }} ₽
                </template>
              </el-table-column>
              <el-table-column v-if="listingFilter !== 'individual'" prop="schedule" label="Расписание" width="120">
                <template #default="{ row }">
                  <span v-if="row.type === 'group'">{{ row.schedule }}</span>
                  <span v-else>—</span>
                </template>
              </el-table-column>
              <el-table-column v-if="listingFilter !== 'individual'" label="Места" width="100">
                <template #default="{ row }">
                  <span v-if="row.type === 'group'">{{ row.current_students }}/{{ row.max_students }}</span>
                  <span v-else>—</span>
                </template>
              </el-table-column>
              <el-table-column prop="level" label="Уровень" width="100">
                <template #default="{ row }">
                  <el-tag size="small">{{ formatLevel(row.level) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="format" label="Формат" width="80">
                <template #default="{ row }">
                  {{ formatFormat(row.format) }}
                </template>
              </el-table-column>
              <el-table-column prop="description" label="Описание" min-width="200" show-overflow-tooltip />
              <el-table-column label="Действия" width="220" fixed="right">
                <template #default="{ row }">
                  <div style="display: flex; gap: 1px;">
                    <el-button 
                      size="small" 
                      @click="$router.push(row.type === 'group' ? `/group-listings/${row.id}/edit` : `/listings/${row.id}/edit`)"
                    >
                      Редактировать
                    </el-button>
                    <el-button 
                      size="small" 
                      type="danger" 
                      @click="handleDelete(row)"
                    >
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

      <!-- Вкладка для ученика: Мои заявки -->
      <el-tab-pane v-if="authStore.isStudent" label="Мои заявки" name="my-bookings">
        <StudentBookingsView />
      </el-tab-pane>

      <!-- Вкладка для репетитора: Заявки ко мне -->
      <el-tab-pane v-if="authStore.isTutor" label="Заявки ко мне" name="tutor-bookings">
        <TutorBookingsView />
      </el-tab-pane>

      <!-- Вкладка для репетитора: Дневник -->
      <el-tab-pane v-if="authStore.isTutor" label="Дневник" name="attendance">
        <AttendanceView />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useListingStore } from '../stores/listing';
import { useGroupListingStore } from '../stores/groupListing';
import { useBookingStore } from '../stores/booking';
import { useGroupBookingStore } from '../stores/groupBooking';
import StudentBookingsView from './StudentBookingsView.vue';
import TutorBookingsView from './TutorBookingsView.vue';
import AttendanceView from './AttendanceView.vue';
import { ElMessage, ElMessageBox } from 'element-plus';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const listingStore = useListingStore();
const groupStore = useGroupListingStore();
const bookingStore = useBookingStore();
const groupBookingStore = useGroupBookingStore();

const activeTab = ref('profile');
const editMode = ref(false);
const listingFilter = ref('all');
const loading = ref(false);

const userProfile = computed(() => authStore.profile?.profile || null);

// Объединенный список всех объявлений
const allListings = computed(() => {
  const individual = listingStore.myListings.map(l => ({ ...l, type: 'individual' }));
  const group = groupStore.myListings.map(g => ({ ...g, type: 'group' }));
  return [...individual, ...group];
});

// Отфильтрованный список по типу
const filteredListings = computed(() => {
  if (listingFilter.value === 'individual') {
    return allListings.value.filter(l => l.type === 'individual');
  }
  if (listingFilter.value === 'group') {
    return allListings.value.filter(l => l.type === 'group');
  }
  return allListings.value;
});

const editForm = ref({
  first_name: '',
  last_name: '',
  phone: '',
  city: '',
  bio: '',
  education: '',
  experience: ''
});

// Загрузка всех объявлений
async function loadMyListings() {
  loading.value = true;
  await Promise.all([
    listingStore.fetchMyListings(),
    groupStore.fetchMyListings()
  ]);
  loading.value = false;
}

// Следим за изменением таба
const handleTabChange = async (tab: string) => {
  // Сохраняем вкладку в URL
  router.replace({ query: { ...route.query, tab } });
  
  if (tab === 'listings' && authStore.isTutor) {
    await loadMyListings();
  }
  if (tab === 'my-bookings' && authStore.isStudent) {
    await bookingStore.fetchMyBookings();
    await groupBookingStore.fetchMyBookings();
  }
  if (tab === 'tutor-bookings' && authStore.isTutor) {
    await bookingStore.fetchTutorBookings();
    await groupBookingStore.fetchTutorBookings();
  }
  // 👇 Добавляем загрузку дневника
  if (tab === 'attendance' && authStore.isTutor) {
    // Данные загрузятся в компоненте AttendanceView
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
  
  // Если в URL есть параметр tab, переключаемся на него
  if (route.query.tab === 'listings') {
    activeTab.value = 'listings';
    if (authStore.isTutor) {
      await loadMyListings();
    }
  } else if (route.query.tab === 'my-bookings') {
    activeTab.value = 'my-bookings';
  } else if (route.query.tab === 'tutor-bookings') {
    activeTab.value = 'tutor-bookings';
  } else if (route.query.tab === 'attendance') {
    activeTab.value = 'attendance';
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

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm('Вы уверены, что хотите удалить это объявление?', 'Подтверждение', {
      confirmButtonText: 'Удалить',
      cancelButtonText: 'Отмена',
      type: 'warning',
    });
    
    if (row.type === 'group') {
      await groupStore.deleteListing(row.id);
    } else {
      await listingStore.deleteListing(row.id);
    }
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