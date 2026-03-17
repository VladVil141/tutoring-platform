<template>
  <div class="listing-detail">
    <div v-loading="loading">
      <el-card v-if="listing" class="detail-card">
        <!-- Шапка с кнопкой назад -->
        <template #header>
          <div class="detail-header">
            <el-button @click="router.back()" text>
              <el-icon><ArrowLeft /></el-icon> Назад
            </el-button>
            <el-tag :type="listing.is_active ? 'success' : 'info'" size="small">
              {{ listing.is_active ? 'Активно' : 'Не активно' }}
            </el-tag>
          </div>
        </template>

        <!-- Основная информация -->
        <div class="listing-main">
          <div class="listing-title-section">
            <h1 class="listing-subject">{{ listing.subject }}</h1>
            <div class="listing-price-large">
              {{ Number(listing.price).toLocaleString() }} ₽ / час
            </div>
          </div>

          <el-divider />

          <!-- Информация о репетиторе -->
          <div class="tutor-section">
            <h2>О репетиторе</h2>
            <div class="tutor-info">
              <el-avatar :size="80" :src="listing.tutor?.profile?.avatar_url" style="background: #2c3e50;">
                {{ listing.tutor?.profile?.first_name?.charAt(0) }}{{ listing.tutor?.profile?.last_name?.charAt(0) }}
              </el-avatar>
              <div class="tutor-details">
                <h3>{{ listing.tutor?.profile?.first_name }} {{ listing.tutor?.profile?.last_name }}</h3>
                <p class="tutor-meta">
                  <el-icon><Location /></el-icon>
                  {{ listing.tutor?.profile?.city || 'Город не указан' }}
                </p>
                <el-button 
                  type="primary" 
                  size="small" 
                  @click="goToTutorProfile"
                >
                  Просмотреть профиль
                </el-button>
              </div>
            </div>

            <!-- Дополнительная информация о репетиторе -->
            <el-descriptions :column="2" border class="tutor-descriptions">
              <el-descriptions-item label="Образование">
                {{ listing.tutor?.profile?.education || 'Не указано' }}
              </el-descriptions-item>
              <el-descriptions-item label="Опыт">
                {{ listing.tutor?.profile?.experience || 'Не указан' }}
              </el-descriptions-item>
            </el-descriptions>
          </div>

          <el-divider />

          <!-- Детали объявления -->
          <div class="details-section">
            <h2>Детали занятия</h2>
            
            <el-descriptions :column="2" border>
              <el-descriptions-item label="Предмет">
                {{ listing.subject }}
              </el-descriptions-item>
              <el-descriptions-item label="Уровень">
                <el-tag size="small">{{ formatLevel(listing.level) }}</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="Формат">
                <el-tag size="small" type="success">{{ formatFormat(listing.format) }}</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="Цена">
                <strong>{{ Number(listing.price).toLocaleString() }} ₽/час</strong>
              </el-descriptions-item>
            </el-descriptions>

            <div class="description-block">
              <h3>Описание занятия</h3>
              <p class="listing-description-full">{{ listing.description }}</p>
            </div>
          </div>

          <!-- Кнопка записи (для Этапа 3) -->
          <el-divider />

          <div class="action-buttons">
            <el-button 
              type="primary" 
              size="large" 
              @click="bookLesson"
              :disabled="!authStore.isAuthenticated || authStore.isTutor"
            >
              {{ getBookingButtonText() }}
            </el-button>
            
            <el-button 
              v-if="isOwner"
              type="warning" 
              size="large" 
              @click="editListing"
            >
              Редактировать
            </el-button>
            
            <el-button 
              v-if="isOwner"
              type="danger" 
              size="large" 
              @click="deleteListing"
            >
              Удалить
            </el-button>
          </div>
        </div>
      </el-card>

      <el-empty v-else-if="!loading" description="Объявление не найдено" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useListingStore } from '../stores/listing';
import { useAuthStore } from '../stores/auth';
import { ArrowLeft, Location } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';

const route = useRoute();
const router = useRouter();
const listingStore = useListingStore();
const authStore = useAuthStore();

const loading = ref(false);
const listing = computed(() => listingStore.currentListing);

const isOwner = computed(() => {
  if (!authStore.user || !listing.value) return false;
  return authStore.user.id === listing.value.tutor_id;
});

onMounted(async () => {
  await loadListing();
});

async function loadListing() {
  const id = Number(route.params.id);
  if (isNaN(id)) {
    router.push('/catalog');
    return;
  }
  
  loading.value = true;
  await listingStore.fetchListing(id);
  loading.value = false;
}

function formatLevel(level: string) {
  const map: Record<string, string> = {
    school: 'Школьный',
    university: 'Университетский',
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

function goToTutorProfile() {
  if (listing.value?.tutor_id) {
    router.push(`/profile/${listing.value.tutor_id}`);
  }
}

function getBookingButtonText() {
  if (!authStore.isAuthenticated) {
    return 'Войдите, чтобы записаться';
  }
  if (authStore.isTutor) {
    return 'Вы репетитор';
  }
  return 'Записаться на занятие';
}

function bookLesson() {
  if (!authStore.isAuthenticated) {
    router.push('/login');
    return;
  }
  
  if (authStore.isTutor) {
    ElMessage.info('Репетиторы не могут записываться на занятия');
    return;
  }
  
  // TODO: Этап 3 - создание заявки
  ElMessage.info('Функция записи будет доступна в Этапе 3');
}

function editListing() {
  router.push(`/listings/${listing.value?.id}/edit`);
}

async function deleteListing() {
  try {
    await ElMessageBox.confirm(
      'Вы уверены, что хотите удалить это объявление?', 
      'Подтверждение', 
      {
        confirmButtonText: 'Удалить',
        cancelButtonText: 'Отмена',
        type: 'warning',
      }
    );
    
    if (listing.value) {
      await listingStore.deleteListing(listing.value.id);
      router.push('/cabinet?tab=listings');
    }
  } catch (error) {
    // Пользователь отменил удаление
  }
}
</script>

<style scoped>
.listing-detail {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.detail-card {
  border-radius: 12px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.listing-main {
  padding: 20px;
}

.listing-title-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.listing-subject {
  font-size: 32px;
  margin: 0;
  color: #2c3e50;
}

.listing-price-large {
  font-size: 28px;
  font-weight: bold;
  color: #2c3e50;
}

.tutor-section {
  margin: 30px 0;
}

.tutor-section h2 {
  margin-bottom: 20px;
  color: #2c3e50;
}

.tutor-info {
  display: flex;
  align-items: center;
  gap: 30px;
  margin-bottom: 30px;
}

.tutor-details h3 {
  margin: 0 0 10px;
  font-size: 24px;
}

.tutor-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #666;
  margin-bottom: 15px;
}

.tutor-descriptions {
  margin-top: 20px;
}

.details-section {
  margin: 30px 0;
}

.details-section h2 {
  margin-bottom: 20px;
  color: #2c3e50;
}

.description-block {
  margin-top: 30px;
}

.description-block h3 {
  margin-bottom: 15px;
  color: #2c3e50;
}

.listing-description-full {
  line-height: 1.8;
  color: #333;
  white-space: pre-wrap;
}

.action-buttons {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 30px;
}

.action-buttons .el-button {
  min-width: 200px;
}

@media (max-width: 768px) {
  .listing-title-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .tutor-info {
    flex-direction: column;
    text-align: center;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .action-buttons .el-button {
    width: 100%;
  }
}
</style>