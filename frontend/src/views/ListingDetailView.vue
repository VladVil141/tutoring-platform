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

          <!-- Кнопки действий -->
          <el-divider />

          <div class="action-buttons">
            <!-- Кнопка записи для учеников -->
            <el-button 
              v-if="!isOwner && authStore.isStudent"
              type="primary" 
              size="large" 
              @click="openBookingModal"
            >
              Записаться на занятие
            </el-button>
            
            <!-- Кнопки для владельца (репетитора) -->
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
            
            <!-- Подсказка для неавторизованных -->
            <el-button 
              v-if="!authStore.isAuthenticated"
              type="info" 
              size="large" 
              @click="goToLogin"
            >
              Войдите, чтобы записаться
            </el-button>
          </div>
        </div>
      </el-card>

      <el-empty v-else-if="!loading" description="Объявление не найдено" />
    </div>

    <!-- Модальное окно записи -->
<el-dialog v-model="bookingModalVisible" :title="isRecurring ? 'Регулярные занятия' : 'Запись на занятие'" width="500px">
  <el-form :model="bookingForm" label-width="120px">
    
    <!-- Для разовых занятий показываем выбор даты -->
    <template v-if="!isRecurring">
      <el-form-item label="Дата">
        <el-date-picker 
          v-model="bookingForm.date" 
          type="date" 
          placeholder="Выберите дату"
          format="DD.MM.YYYY"
          value-format="YYYY-MM-DD"
          :disabled-date="disabledDate"
          style="width: 100%;"
        />
      </el-form-item>
    </template>
    
    <!-- Для регулярных занятий дата не нужна -->
    
    <el-form-item label="Время">
      <el-time-select
        v-model="bookingForm.time"
        start="08:00"
        step="01:00"
        end="22:00"
        placeholder="Выберите время"
        style="width: 100%;"
      />
    </el-form-item>

    <el-form-item label="Тип занятия">
      <el-radio-group v-model="isRecurring">
        <el-radio :value="false">Разовое</el-radio>
        <el-radio :value="true">Регулярное</el-radio>
      </el-radio-group>
    </el-form-item>

    <!-- Блок для регулярных занятий -->
<template v-if="isRecurring">
  <el-form-item label="Дни недели">
    <el-checkbox-group v-model="recurringForm.weekdays">
      <el-checkbox label="ПН">Пн</el-checkbox>
      <el-checkbox label="ВТ">Вт</el-checkbox>
      <el-checkbox label="СР">Ср</el-checkbox>
      <el-checkbox label="ЧТ">Чт</el-checkbox>
      <el-checkbox label="ПТ">Пт</el-checkbox>
      <el-checkbox label="СБ">Сб</el-checkbox>
      <el-checkbox label="ВС">Вс</el-checkbox>
    </el-checkbox-group>
  </el-form-item>

  <el-form-item label="Количество недель">
    <el-slider 
      v-model="recurringForm.weeks" 
      :min="1" 
      :max="12" 
      :marks="{1: '1', 4: '4', 8: '8', 12: '12'}"
      show-input
    />
  </el-form-item>

  <!-- Отступ перед алертом -->
  <div style="height: 20px;"></div>

  <!-- Используем сетку Element Plus -->
  <el-row>
    <el-col :span="24">
      <el-alert
        v-if="recurringForm.weekdays.length > 0"
        type="info"
        :closable="false">
        <p>Будет создано {{ recurringForm.weekdays.length * recurringForm.weeks }} занятий</p>
        <p style="font-size: 0.9em; color: #666;">Начиная со следующей недели</p>
      </el-alert>
    </el-col>
  </el-row>
</template>
  </el-form>
  
  <template #footer>
    <span class="dialog-footer">
      <el-button @click="bookingModalVisible = false">Отмена</el-button>
      <el-button 
        type="primary" 
        @click="submitBooking" 
        :loading="bookingLoading"
      >
        {{ isRecurring ? 'Создать расписание' : 'Отправить заявку' }}
      </el-button>
    </span>
  </template>
</el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useListingStore } from '../stores/listing';
import { useBookingStore } from '../stores/booking';
import { useAuthStore } from '../stores/auth';
import { ArrowLeft, Location } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';

const route = useRoute();
const router = useRouter();
const listingStore = useListingStore();
const bookingStore = useBookingStore();
const authStore = useAuthStore();

const loading = ref(false);
const bookingModalVisible = ref(false);
const bookingLoading = ref(false);
const isRecurring = ref(false);

const listing = computed(() => listingStore.currentListing);
const isOwner = computed(() => {
  if (!authStore.user || !listing.value) return false;
  return authStore.user.id === listing.value.tutor_id;
});

const bookingForm = ref({
  date: '',
  time: ''
});

const recurringForm = ref({
  weekdays: [] as string[],
  weeks: 4
});

// Маппинг дней недели
const dayMap: Record<string, number> = {
  'ПН': 1, 'ВТ': 2, 'СР': 3, 'ЧТ': 4, 'ПТ': 5, 'СБ': 6, 'ВС': 0
};

const reverseDayMap: Record<number, string> = {
  1: 'ПН', 2: 'ВТ', 3: 'СР', 4: 'ЧТ', 5: 'ПТ', 6: 'СБ', 0: 'ВС'
};

// Сброс формы при закрытии
watch(bookingModalVisible, (val) => {
  if (!val) {
    bookingForm.value = { date: '', time: '' };
    recurringForm.value = { weekdays: [], weeks: 4 };
    isRecurring.value = false;
  }
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

function goToLogin() {
  router.push('/login');
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

// Запрет на прошедшие даты
function disabledDate(time: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return time.getTime() < today.getTime();
}

function openBookingModal() {
  bookingForm.value = { date: '', time: '' };
  bookingModalVisible.value = true;
}

async function submitBooking() {
  if (!bookingForm.value.time) {
    ElMessage.warning('Выберите время');
    return;
  }
  
  bookingLoading.value = true;
  
  if (isRecurring.value) {
    // Регулярное занятие
    if (recurringForm.value.weekdays.length === 0) {
      ElMessage.warning('Выберите дни недели');
      bookingLoading.value = false;
      return;
    }
    
    const success = await bookingStore.createRecurring({
      listing_id: listing.value!.id,
      time: bookingForm.value.time,
      weekdays: recurringForm.value.weekdays,
      weeks: recurringForm.value.weeks
    });
    
    if (success) {
      bookingModalVisible.value = false;
      ElMessage.success(`Создано ${success.length} занятий`);
    }
  } else {
    // Разовое занятие
    if (!bookingForm.value.date) {
      ElMessage.warning('Выберите дату');
      bookingLoading.value = false;
      return;
    }
    
    const available = await bookingStore.checkAvailability(
      listing.value!.id,
      bookingForm.value.date,
      bookingForm.value.time
    );
    
    if (!available) {
      ElMessage.error('Это время уже занято');
      bookingLoading.value = false;
      return;
    }
    
    const success = await bookingStore.createBooking({
      listing_id: listing.value!.id,
      date: bookingForm.value.date,
      time: bookingForm.value.time
    });
    
    if (success) {
      bookingModalVisible.value = false;
      ElMessage.success('Заявка отправлена! Ожидайте подтверждения');
    }
  }
  
  bookingLoading.value = false;
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