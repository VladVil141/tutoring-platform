<template>
  <div>
    <el-tabs v-model="activeTab">
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
              <el-avatar :size="80" :src="userProfile.avatar_url" style="background: #409EFF;">
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
              <el-descriptions-item label="Город">{{ userProfile.city }}</el-descriptions-item>
              <el-descriptions-item label="О себе">{{ userProfile.bio || 'Нет информации' }}</el-descriptions-item>
              
              <!-- Дополнительные поля для репетитора -->
              <template v-if="authStore.isTutor">
                <el-descriptions-item label="Образование">{{ userProfile.education || 'Не указано' }}</el-descriptions-item>
                <el-descriptions-item label="Опыт">{{ userProfile.experience || 'Не указан' }}</el-descriptions-item>
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

      <!-- Вкладка для репетитора: Мои объявления (будет в Этапе 2) -->
      <el-tab-pane v-if="authStore.isTutor" label="Мои объявления" name="listings">
        <el-card>
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <h2>Мои объявления</h2>
              <el-button type="primary" @click="createListing">+ Создать объявление</el-button>
            </div>
          </template>
          <el-empty description="У вас пока нет объявлений" />
        </el-card>
      </el-tab-pane>

      <!-- Вкладка для ученика: Мои заявки -->
      <el-tab-pane v-if="authStore.isStudent" label="Мои заявки" name="bookings">
        <el-card>
          <template #header>
            <h2>Мои заявки</h2>
          </template>
          <el-empty description="У вас пока нет заявок" />
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { ElMessage } from 'element-plus';

const router = useRouter();
const authStore = useAuthStore();
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

onMounted(async () => {
  if (!authStore.isAuthenticated) {
    router.push('/login');
    return;
  }
  
  await authStore.fetchProfile();
  
  if (userProfile.value) {
    editForm.value.first_name = userProfile.value.first_name || '';
    editForm.value.last_name = userProfile.value.last_name || '';
    editForm.value.phone = userProfile.value.phone || '';
    editForm.value.city = userProfile.value.city || '';
    editForm.value.bio = userProfile.value.bio || '';
    editForm.value.education = userProfile.value.education || '';
    editForm.value.experience = userProfile.value.experience || '';
  }
});

async function saveProfile() {
  const success = await authStore.updateProfile(editForm.value);
  if (success) {
    editMode.value = false;
    await authStore.fetchProfile();
  }
}

function createListing() {
  ElMessage.info('Функция будет доступна в Этапе 2');
}
</script>

<style scoped>
:deep(.el-descriptions__label) {
  width: 150px;
}
</style>