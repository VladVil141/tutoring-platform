<template>
  <div class="booking-detail">
    <div v-loading="loading">
      <el-card v-if="booking" class="detail-card">
        <template #header>
          <div class="detail-header">
            <el-button @click="router.back()" text>
              <el-icon><ArrowLeft /></el-icon> Назад
            </el-button>
            <el-tag :type="getStatusType(booking.status)" size="large">
              {{ getStatusText(booking.status) }}
            </el-tag>
          </div>
        </template>

        <div class="booking-info">
          <h1 class="subject">{{ booking.listing?.subject }}</h1>
          
          <el-divider />

          <el-descriptions :column="1" border>
            <el-descriptions-item label="Дата">
  <strong>{{ formatDisplayDate(booking.date) }}</strong>
</el-descriptions-item>
            <el-descriptions-item label="Время">
              <strong>{{ booking.time }}</strong>
            </el-descriptions-item>
            <el-descriptions-item label="Длительность">
              1 час
            </el-descriptions-item>
            <el-descriptions-item label="Цена">
              <span class="price">{{ Number(booking.listing?.price).toLocaleString() }} ₽ / час</span>
            </el-descriptions-item>
            <el-descriptions-item label="Репетитор">
              <div class="tutor-info" @click="goToTutorProfile(booking.listing?.tutor?.id)">
                <el-avatar :size="40" :src="booking.listing?.tutor?.profile?.avatar_url">
                  {{ booking.listing?.tutor?.profile?.first_name?.charAt(0) }}
                </el-avatar>
                <div>
                  <div class="tutor-name">
                    {{ booking.listing?.tutor?.profile?.first_name }} {{ booking.listing?.tutor?.profile?.last_name }}
                  </div>
                  <div class="tutor-city">{{ booking.listing?.tutor?.profile?.city || 'Город не указан' }}</div>
                </div>
              </div>
            </el-descriptions-item>
            <el-descriptions-item v-if="authStore.isTutor" label="Ученик">
              <div class="student-info">
                <el-avatar :size="40" :src="booking.student?.profile?.avatar_url">
                  {{ booking.student?.profile?.first_name?.charAt(0) }}
                </el-avatar>
                <div>
                  <div class="student-name">
                    {{ booking.student?.profile?.first_name }} {{ booking.student?.profile?.last_name }}
                  </div>
                  <div class="student-email">{{ booking.student?.email }}</div>
                </div>
              </div>
            </el-descriptions-item>
            <el-descriptions-item label="Статус">
              <el-tag :type="getStatusType(booking.status)" size="small">
                {{ getStatusText(booking.status) }}
              </el-tag>
            </el-descriptions-item>
          </el-descriptions>

          <!-- Кнопки действий -->
          <div class="action-buttons">
            <el-button 
              v-if="booking.status === 'confirmed'"
              type="warning" 
              size="large"
              @click="contact"
            >
              Связаться
            </el-button>
            <!-- Для ученика -->
            <template v-if="authStore.isStudent">
              <el-button 
                v-if="booking.status === 'pending'"
                type="danger" 
                size="large"
                @click="cancelBooking"
                :loading="actionLoading"
              >
                Отменить заявку
              </el-button>
              <el-button 
                v-if="booking.status === 'confirmed'"
                type="warning" 
                size="large"
                @click="rescheduleBooking"
                :disabled="true"
                title="Функция будет доступна в Этапе 8"
              >
                Перенести
              </el-button>
            </template>

            <!-- Для репетитора -->
            <template v-if="authStore.isTutor">
              <el-button 
                v-if="booking.status === 'pending'"
                type="success" 
                size="large"
                @click="confirmBooking"
                :loading="actionLoading"
              >
                Подтвердить
              </el-button>
              <el-button 
                v-if="booking.status === 'pending'"
                type="danger" 
                size="large"
                @click="rejectBooking"
                :loading="actionLoading"
              >
                Отклонить
              </el-button>
              <el-button 
                v-if="booking.status === 'confirmed'"
                type="primary" 
                size="large"
                @click="completeBooking"
                :loading="actionLoading"
              >
                Отметить как выполненное
              </el-button>
              <el-button 
                v-if="booking.status === 'confirmed'"
                type="warning" 
                size="large"
                @click="rescheduleBooking"
                :disabled="true"
                title="Функция будет доступна в Этапе 8"
              >
                Перенести
              </el-button>
            </template>
          </div>
        </div>
      </el-card>

      <el-empty v-else-if="!loading" description="Заявка не найдена" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useBookingStore } from '../stores/booking';
import { useAuthStore } from '../stores/auth';
import { useChatStore } from '../stores/chat';
import { ArrowLeft } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';

const route = useRoute();
const router = useRouter();
const bookingStore = useBookingStore();
const authStore = useAuthStore();
const chatStore = useChatStore();

const loading = ref(false);
const actionLoading = ref(false);
const booking = ref<any>(null);

onMounted(async () => {
  await loadBooking();
});

async function loadBooking() {
  const id = Number(route.params.id);
  if (isNaN(id)) {
    router.push('/schedule');
    return;
  }
  
  loading.value = true;
  const data = await bookingStore.fetchBooking(id);
  if (data) {
    booking.value = data;
  }
  loading.value = false;
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('ru-RU', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function getStatusType(status: string) {
  const map: Record<string, string> = {
    pending: 'warning',
    confirmed: 'success',
    cancelled: 'danger',
    completed: 'info'
  };
  return map[status] || 'info';
}

function getStatusText(status: string) {
  const map: Record<string, string> = {
    pending: 'Ожидание подтверждения',
    confirmed: 'Подтверждено',
    cancelled: 'Отменено',
    completed: 'Выполнено'
  };
  return map[status] || status;
}

function goToTutorProfile(tutorId: number) {
  router.push(`/profile/${tutorId}`);
}

async function contact() {
  if (!booking.value) return;
  
  const otherId = authStore.isStudent ? booking.value.tutor_id : booking.value.student_id;
  const chat = await chatStore.createPrivateChat(otherId);
  if (chat) {
    router.push(`/chat/private/${chat.id}`);
  }
}

async function confirmBooking() {
  try {
    await ElMessageBox.confirm('Подтвердить эту заявку?', 'Подтверждение', {
      confirmButtonText: 'Да, подтвердить',
      cancelButtonText: 'Нет',
      type: 'info'
    });
    
    actionLoading.value = true;
    await bookingStore.confirmBooking(booking.value.id);
    await loadBooking();
    ElMessage.success('Заявка подтверждена');
  } catch (error) {
    // Пользователь отменил действие
  } finally {
    actionLoading.value = false;
  }
}

async function rejectBooking() {
  try {
    await ElMessageBox.confirm('Отклонить эту заявку?', 'Подтверждение', {
      confirmButtonText: 'Да, отклонить',
      cancelButtonText: 'Нет',
      type: 'warning'
    });
    
    actionLoading.value = true;
    await bookingStore.cancelBooking(booking.value.id, 'tutor');
    await loadBooking();
    ElMessage.success('Заявка отклонена');
  } catch (error) {
    // Пользователь отменил действие
  } finally {
    actionLoading.value = false;
  }
}

async function completeBooking() {
  try {
    await ElMessageBox.confirm('Отметить занятие как выполненное?', 'Подтверждение', {
      confirmButtonText: 'Да',
      cancelButtonText: 'Нет',
      type: 'info'
    });
    
    actionLoading.value = true;
    await bookingStore.completeBooking(booking.value.id);
    await loadBooking();
    ElMessage.success('Занятие отмечено как выполненное');
  } catch (error) {
    // Пользователь отменил действие
  } finally {
    actionLoading.value = false;
  }
}

async function cancelBooking() {
  try {
    await ElMessageBox.confirm('Отменить эту заявку?', 'Подтверждение', {
      confirmButtonText: 'Да, отменить',
      cancelButtonText: 'Нет',
      type: 'warning'
    });
    
    actionLoading.value = true;
    await bookingStore.cancelBooking(booking.value.id, 'student');
    await loadBooking();
    ElMessage.success('Заявка отменена');
  } catch (error) {
    // Пользователь отменил действие
  } finally {
    actionLoading.value = false;
  }
}

function rescheduleBooking() {
  ElMessage.info('Функция переноса будет доступна в Этапе 8');
}
</script>

<style scoped>
.booking-detail {
  max-width: 800px;
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

.booking-info {
  padding: 20px;
}

.subject {
  font-size: 28px;
  color: #2c3e50;
  margin: 0 0 20px;
  text-align: center;
}

.price {
  font-size: 18px;
  font-weight: bold;
  color: #2c3e50;
}

.tutor-info, .student-info {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.tutor-info:hover, .student-info:hover {
  opacity: 0.8;
}

.tutor-name, .student-name {
  font-weight: 500;
  color: #2c3e50;
}

.tutor-city, .student-email {
  font-size: 12px;
  color: #909399;
}

.action-buttons {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 30px;
  flex-wrap: wrap;
}

.action-buttons .el-button {
  min-width: 180px;
}

@media (max-width: 768px) {
  .action-buttons {
    flex-direction: column;
  }
  
  .action-buttons .el-button {
    width: 100%;
  }
}
</style>