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
            <div>
              <el-tag type="warning" size="large" class="type-badge">Групповое занятие</el-tag>
              <el-tag :type="listing.is_active ? 'success' : 'info'" size="small">
                {{ listing.is_active ? 'Набор открыт' : 'Набор закрыт' }}
              </el-tag>
            </div>
          </div>
        </template>

        <!-- Основная информация -->
        <div class="listing-main">
          <div class="listing-title-section">
            <h1 class="listing-subject">{{ listing.subject }}</h1>
            <div class="listing-price-large">
              {{ Number(listing.price).toLocaleString() }} ₽ / час с человека
            </div>
          </div>

          <!-- Прогресс набора группы -->
          <el-card class="group-progress-card" shadow="never">
            <div class="progress-header">
              <h3>Набор в группу</h3>
              <span class="students-count">
                {{ listing.current_students }} из {{ listing.max_students }} мест
              </span>
            </div>
            <el-progress 
              :percentage="(listing.current_students / listing.max_students) * 100" 
              :status="listing.current_students >= listing.min_students ? 'success' : 'warning'"
              :stroke-width="20"
              :show-text="false"
            />
            <div class="progress-footer">
              <span>Минимум для старта: {{ listing.min_students }} учеников</span>
              <span v-if="listing.current_students >= listing.min_students" class="ready-badge">
                ✅ Готов к старту
              </span>
              <span v-else class="waiting-badge">
                ⏳ Ожидаем еще {{ listing.min_students - listing.current_students }}
              </span>
            </div>
          </el-card>

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
          </div>

          <el-divider />

          <!-- Детали группы -->
          <div class="details-section">
            <h2>Детали группы</h2>
            
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
              <el-descriptions-item label="Расписание">
                <el-icon><Calendar /></el-icon>
                {{ listing.schedule }}
              </el-descriptions-item>
              <el-descriptions-item label="Длительность курса">
                {{ listing.weeks || 4 }} недель
              </el-descriptions-item>
              <el-descriptions-item label="Цена">
                <strong>{{ Number(listing.price).toLocaleString() }} ₽/час</strong>
              </el-descriptions-item>
              <el-descriptions-item label="Размер группы">
                {{ listing.min_students }} - {{ listing.max_students }} человек
              </el-descriptions-item>
            </el-descriptions>

            <div class="description-block">
              <h3>Описание занятий</h3>
              <p class="listing-description-full">{{ listing.description }}</p>
            </div>
          </div>

          <!-- Кнопка подачи заявки -->
          <el-divider />

          <div class="action-buttons">
            <!-- Для учеников, если группа не заполнена -->
            <el-button 
              v-if="!isOwner && authStore.isStudent && listing.is_active"
              type="warning" 
              size="large" 
              @click="applyToGroup" 
              :loading="applying"
              :disabled="hasApplied || isInGroup"
            >
              {{ getApplyButtonText() }}
            </el-button>
            
            <!-- Для владельца (репетитора) -->
            <el-button 
              v-if="isOwner"
              type="primary" 
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

      <el-empty v-else-if="!loading" description="Групповое объявление не найдено" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useGroupListingStore } from '../stores/groupListing';
import { useAuthStore } from '../stores/auth';
import { ArrowLeft, Location, Calendar } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useGroupBookingStore } from '../stores/groupBooking';

const route = useRoute();
const router = useRouter();
const groupStore = useGroupListingStore();
const authStore = useAuthStore();
const groupBookingStore = useGroupBookingStore();

const loading = ref(false);
const applying = ref(false);
const hasApplied = ref(false);
const isInGroup = ref(false);

const listing = computed(() => groupStore.currentListing);

const isOwner = computed(() => {
  if (!authStore.user || !listing.value) return false;
  return authStore.user.id === listing.value.tutor_id;
});

onMounted(async () => {
  await loadListing();
  await checkBookingStatus();
});

async function checkBookingStatus() {
  if (!authStore.isAuthenticated || !authStore.isStudent) return;
  
  await groupBookingStore.fetchMyBookings();
  const existing = groupBookingStore.myBookings.find(
    b => b.group_listing_id === listing.value?.id
  );
  
  if (existing) {
    if (existing.status === 'pending') {
      hasApplied.value = true;
    } else if (existing.status === 'approved') {
      isInGroup.value = true;
    }
  }
}

async function loadListing() {
  const id = Number(route.params.id);
  if (isNaN(id)) {
    router.push('/catalog');
    return;
  }
  
  loading.value = true;
  await groupStore.fetchListing(id);
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

function getApplyButtonText() {
  if (!authStore.isAuthenticated) {
    return 'Войдите, чтобы подать заявку';
  }
  if (authStore.isTutor) {
    return 'Вы репетитор';
  }
  if (!listing.value?.is_active) {
    return 'Группа заполнена';
  }
  if (hasApplied.value) {
    return 'Заявка уже подана';
  }
  if (isInGroup.value) {
    return 'Вы уже в группе';
  }
  return 'Подать заявку в группу';
}

async function applyToGroup() {
  if (!authStore.isAuthenticated) {
    router.push('/login');
    return;
  }
  
  if (authStore.isTutor) {
    ElMessage.warning('Репетиторы не могут подавать заявки');
    return;
  }
  
  if (!listing.value?.is_active) {
    ElMessage.warning('Группа уже заполнена');
    return;
  }
  
  applying.value = true;
  const success = await groupBookingStore.createBooking(listing.value!.id);
  applying.value = false;
  
  if (success) {
    hasApplied.value = true;
    ElMessage.success('Заявка отправлена! Ожидайте подтверждения');
  }
}

function editListing() {
  router.push(`/group-listings/${listing.value?.id}/edit`);
}

async function deleteListing() {
  try {
    await ElMessageBox.confirm(
      'Вы уверены, что хотите удалить это групповое объявление?', 
      'Подтверждение', 
      {
        confirmButtonText: 'Удалить',
        cancelButtonText: 'Отмена',
        type: 'warning',
      }
    );
    
    if (listing.value) {
      await groupStore.deleteListing(listing.value.id);
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

.type-badge {
  margin-right: 10px;
}

.listing-main {
  padding: 20px;
}

.listing-title-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.listing-subject {
  font-size: 32px;
  margin: 0;
  color: #2c3e50;
}

.listing-price-large {
  font-size: 28px;
  font-weight: bold;
  color: #ff9800;
}

.group-progress-card {
  background: #f8f9fa;
  margin-bottom: 30px;
  border: 1px solid #e9ecef;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.progress-header h3 {
  margin: 0;
  color: #2c3e50;
}

.students-count {
  font-weight: bold;
  color: #ff9800;
}

.progress-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 15px;
  color: #666;
}

.ready-badge {
  color: #67c23a;
  font-weight: 500;
}

.waiting-badge {
  color: #e6a23c;
  font-weight: 500;
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
  
  .progress-footer {
    flex-direction: column;
    gap: 10px;
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