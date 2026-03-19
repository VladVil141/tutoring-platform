<template>
  <div class="bookings-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <h2>Мои заявки</h2>
          <el-radio-group v-model="filterStatus" @change="loadBookings">
            <el-radio value="">Все</el-radio>
            <el-radio value="pending">Ожидание</el-radio>
            <el-radio value="confirmed">Подтверждено</el-radio>
            <el-radio value="cancelled">Отменено</el-radio>
            <el-radio value="completed">Выполнено</el-radio>
          </el-radio-group>
        </div>
      </template>

      <el-table :data="filteredBookings" v-loading="loading" style="width: 100%">
        <el-table-column prop="date" label="Дата" width="120">
          <template #default="{ row }">
            {{ formatDate(row.date) }}
          </template>
        </el-table-column>
        
        <el-table-column prop="time" label="Время" width="100" />
        
        <el-table-column prop="listing.subject" label="Предмет" width="150" />
        
        <el-table-column label="Репетитор" width="200">
          <template #default="{ row }">
            <div style="display: flex; align-items: center; gap: 10px;">
              <el-avatar :size="30" :src="row.listing?.tutor?.profile?.avatar_url">
                {{ row.listing?.tutor?.profile?.first_name?.charAt(0) }}
              </el-avatar>
              <span>{{ row.listing?.tutor?.profile?.first_name }} {{ row.listing?.tutor?.profile?.last_name }}</span>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="price" label="Цена" width="100">
          <template #default="{ row }">
            {{ Number(row.listing?.price).toLocaleString() }} ₽
          </template>
        </el-table-column>
        
        <el-table-column label="Статус" width="130">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="Действия" width="150" fixed="right">
          <template #default="{ row }">
            <el-button 
              v-if="row.status === 'pending'"
              size="small" 
              type="danger" 
              @click="cancelBooking(row.id)"
            >
              Отменить
            </el-button>
            <el-button 
              v-else-if="row.status === 'confirmed'"
              size="small" 
              type="warning" 
              @click="contactTutor(row)"
            >
              Связаться
            </el-button>
            <span v-else>—</span>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!filteredBookings.length && !loading" description="У вас пока нет заявок" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useBookingStore } from '../stores/booking';
import { ElMessage, ElMessageBox } from 'element-plus';

const router = useRouter();
const bookingStore = useBookingStore();
const loading = ref(false);
const filterStatus = ref('');

const filteredBookings = computed(() => {
  if (!filterStatus.value) return bookingStore.myBookings;
  return bookingStore.myBookings.filter(b => b.status === filterStatus.value);
});

onMounted(async () => {
  await loadBookings();
});

async function loadBookings() {
  loading.value = true;
  await bookingStore.fetchMyBookings();
  loading.value = false;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('ru-RU');
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
    pending: 'Ожидание',
    confirmed: 'Подтверждено',
    cancelled: 'Отменено',
    completed: 'Выполнено'
  };
  return map[status] || status;
}

async function cancelBooking(id: number) {
  try {
    await ElMessageBox.confirm('Отменить эту заявку?', 'Подтверждение', {
      confirmButtonText: 'Да, отменить',
      cancelButtonText: 'Нет',
      type: 'warning'
    });
    
    await bookingStore.cancelBooking(id, 'student');
    await loadBookings();
  } catch (error) {
    // Пользователь отменил действие
  }
}

function contactTutor(row: any) {
  ElMessage.info('Функция связи будет доступна позже');
  // TODO: открыть чат или показать контакты
}
</script>

<style scoped>
.bookings-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
}

.card-header h2 {
  margin: 0;
  color: #2c3e50;
}

:deep(.el-table) {
  margin-top: 20px;
}
</style>