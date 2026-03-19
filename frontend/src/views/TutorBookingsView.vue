<template>
  <div class="bookings-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <h2>Заявки ко мне</h2>
          <el-radio-group v-model="filterStatus" @change="loadBookings">
            <el-radio value="">Все</el-radio>
            <el-radio value="pending">Ожидание</el-radio>
            <el-radio value="confirmed">Подтверждено</el-radio>
            <el-radio value="cancelled">Отменено</el-radio>
            <el-radio value="completed">Выполнено</el-radio>
          </el-radio-group>
        </div>
      </template>

      <!-- Регулярные серии -->
      <div v-if="filteredRecurringGroups.length" class="recurring-section">
        <h3>Регулярные занятия</h3>
        <el-table :data="filteredRecurringGroups" style="width: 100%" class="recurring-table" :show-header="true">
          <el-table-column label="Ученик" min-width="200">
            <template #default="{ row }">
              <div style="display: flex; align-items: center; gap: 8px;">
                <el-avatar :size="30" :src="row[0]?.student?.profile?.avatar_url">
                  {{ row[0]?.student?.profile?.first_name?.charAt(0) }}
                </el-avatar>
                <span>{{ row[0]?.student?.profile?.first_name }} {{ row[0]?.student?.profile?.last_name }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="Предмет" min-width="150">
            <template #default="{ row }">
              <strong>{{ row[0]?.listing?.subject }}</strong>
            </template>
          </el-table-column>
          <el-table-column label="Расписание" min-width="180">
            <template #default="{ row }">
              {{ row[0]?.recurring_pattern }} {{ row[0]?.time }}
            </template>
          </el-table-column>
          <el-table-column label="Занятий" width="100" align="center">
            <template #default="{ row }">
              {{ row.length }}
            </template>
          </el-table-column>
          <el-table-column label="Статус" width="140" align="center">
            <template #default="{ row }">
              <el-tag :type="getSeriesStatus(row).type" size="small" effect="dark" style="width: 100%; text-align: center;">
                {{ getSeriesStatus(row).text }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="Действия" fixed="right" align="right" width="280">
            <template #default="{ row }">
              <div style="display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap;">
                <el-button size="small" @click="showSeries(row)">
                  Подробнее
                </el-button>
                <el-button 
                  v-if="canCancelSeries(row)"
                  size="small" 
                  type="danger" 
                  @click="cancelSeries(row[0]?.recurring_id)"
                >
                  Отменить серию
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- Разовые заявки -->
      <h3 v-if="filteredRecurringGroups.length" class="section-subtitle">Разовые заявки</h3>
      <el-table :data="filteredSingleBookings" v-loading="loading" style="width: 100%" :show-header="true">
        <el-table-column prop="date" label="Дата" width="120">
          <template #default="{ row }">
            {{ formatDate(row.date) }}
          </template>
        </el-table-column>
        
        <el-table-column prop="time" label="Время" width="100" align="center" />
        
        <el-table-column prop="listing.subject" label="Предмет" min-width="150" />
        
        <el-table-column label="Ученик" min-width="200">
          <template #default="{ row }">
            <div style="display: flex; align-items: center; gap: 8px;">
              <el-avatar :size="30" :src="row.student?.profile?.avatar_url">
                {{ row.student?.profile?.first_name?.charAt(0) }}
              </el-avatar>
              <span>{{ row.student?.profile?.first_name }} {{ row.student?.profile?.last_name }}</span>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="Статус" width="140" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small" effect="dark" style="width: 100%; text-align: center;">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="Действия" fixed="right" align="right" width="320">
  <template #default="{ row }">
    <div style="display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap;">
      <el-button 
        v-if="row.status === 'pending'"
        size="small" 
        type="success" 
        @click="confirmBooking(row.id)"
      >
        Подтвердить
      </el-button>
      <el-button 
        v-if="row.status === 'pending'"
        size="small" 
        type="danger" 
        @click="rejectBooking(row.id)"
      >
        Отклонить
      </el-button>
      <template v-if="row.status === 'confirmed'">
        <el-button 
          size="small" 
          type="primary" 
          @click="completeBooking(row.id)"
        >
          Завершить
        </el-button>
        <el-button 
          size="small" 
          type="warning" 
          @click="contactStudent(row)"
        >
          Связаться
        </el-button>
        <el-button 
          size="small" 
          type="primary" 
          @click="rescheduleBooking(row)"
          :disabled="true"
          title="Функция будет доступна в Этапе 8"
        >
          Перенести
        </el-button>
      </template>
    </div>
  </template>
</el-table-column>
      </el-table>

      <el-empty 
        v-if="!filteredSingleBookings.length && !filteredRecurringGroups.length && !loading" 
        description="Заявок пока нет" 
      />
    </el-card>

    <!-- Модальное окно с деталями серии -->
    <el-dialog v-model="seriesModalVisible" title="Детали серии" width="1000px" class="series-dialog">
      <el-table :data="currentSeries" style="width: 100%" :show-header="true">
        <el-table-column prop="date" label="Дата" width="140">
          <template #default="{ row }">
            {{ formatDate(row.date) }}
          </template>
        </el-table-column>
        <el-table-column prop="time" label="Время" width="100" align="center" />
        <el-table-column label="Ученик" min-width="200">
          <template #default="{ row }">
            <div style="display: flex; align-items: center; gap: 8px;">
              <el-avatar :size="30" :src="row.student?.profile?.avatar_url">
                {{ row.student?.profile?.first_name?.charAt(0) }}
              </el-avatar>
              <span>{{ row.student?.profile?.first_name }} {{ row.student?.profile?.last_name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="Предмет" min-width="150">
          <template #default="{ row }">
            {{ row.listing?.subject }}
          </template>
        </el-table-column>
        <el-table-column label="Статус" width="140" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small" effect="dark" style="width: 100%; text-align: center;">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Действия" fixed="right" align="right" width="230">
  <template #default="{ row }">
    <div style="display: flex; gap: 8px; justify-content: flex-end;">
      <template v-if="row.status === 'pending'">
        <el-button size="small" type="success" @click="confirmBooking(row.id)" style="padding: 5px 10px;">
          Подтвердить
        </el-button>
        <el-button size="small" type="danger" @click="rejectBooking(row.id)" style="padding: 5px 10px;">
          Отклонить
        </el-button>
      </template>
      <template v-else-if="row.status === 'confirmed'">
        <el-button 
          size="small" 
          type="primary" 
          @click="completeBooking(row.id)"
          style="padding: 5px 15px;"
        >
          Завершить
        </el-button>
        <el-button 
          size="small" 
          type="primary" 
          @click="rescheduleBooking(row)"
          :disabled="true"
          style="padding: 5px 15px;"
          title="Функция будет доступна в Этапе 8"
        >
          Перенести
        </el-button>
      </template>
      <span v-else style="display: inline-block; width: 70px; text-align: center;">—</span>
    </div>
  </template>
</el-table-column>
      </el-table>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="seriesModalVisible = false">Закрыть</el-button>
        </div>
      </template>
    </el-dialog>
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
const seriesModalVisible = ref(false);
const currentSeries = ref<any[]>([]);

// Группировка по recurring_id
const recurringGroups = computed(() => {
  const groups: Record<string, any[]> = {};
  bookingStore.tutorBookings.forEach(booking => {
    const recurringId = booking.recurring_id;
    if (recurringId) {
      if (!groups[recurringId]) {
        groups[recurringId] = [];
      }
      groups[recurringId].push(booking);
    }
  });
  return Object.values(groups);
});

// Фильтрация регулярных серий по статусу
const filteredRecurringGroups = computed(() => {
  if (!filterStatus.value) return recurringGroups.value;
  
  return recurringGroups.value.filter(group => {
    return group.some(booking => booking.status === filterStatus.value);
  });
});

// Разовые заявки (без recurring_id)
const singleBookings = computed(() => {
  return bookingStore.tutorBookings.filter(b => !b.recurring_id);
});

// Фильтрация разовых заявок по статусу
const filteredSingleBookings = computed(() => {
  if (!filterStatus.value) return singleBookings.value;
  return singleBookings.value.filter(b => b.status === filterStatus.value);
});

function getSeriesStatus(series: any[]) {
  const hasPending = series.some(b => b.status === 'pending');
  const hasConfirmed = series.some(b => b.status === 'confirmed');
  const allConfirmed = series.every(b => b.status === 'confirmed');
  const allCompleted = series.every(b => b.status === 'completed');
  const allCancelled = series.every(b => b.status === 'cancelled');
  
  if (allCompleted) return { type: 'success', text: 'Завершено' };
  if (allCancelled) return { type: 'danger', text: 'Отменено' };
  if (allConfirmed) return { type: 'success', text: 'Подтверждено' };
  if (hasConfirmed && !hasPending) return { type: 'success', text: 'Подтверждено' };
  if (hasPending) return { type: 'warning', text: 'Ожидание' };
  
  return { type: 'info', text: 'Смешанный' };
}

function canCancelSeries(series: any[]) {
  // Можно отменить серию, если есть хотя бы одна заявка в статусе pending или confirmed
  // Но не если все уже выполнены или отменены
  const hasActive = series.some(b => b.status === 'pending' || b.status === 'confirmed');
  const allCompleted = series.every(b => b.status === 'completed');
  const allCancelled = series.every(b => b.status === 'cancelled');
  
  return hasActive && !allCompleted && !allCancelled;
}

function showSeries(series: any[]) {
  currentSeries.value = series;
  seriesModalVisible.value = true;
}

async function cancelSeries(recurringId: string) {
  try {
    await ElMessageBox.confirm('Отменить всю серию занятий?', 'Подтверждение', {
      confirmButtonText: 'Да, отменить',
      cancelButtonText: 'Нет',
      type: 'warning'
    });
    
    await bookingStore.cancelRecurring(recurringId);
    await loadBookings();
  } catch (error) {
    // Пользователь отменил действие
  }
}

onMounted(async () => {
  await loadBookings();
});

async function loadBookings() {
  loading.value = true;
  await bookingStore.fetchTutorBookings();
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

async function confirmBooking(id: number) {
  try {
    await ElMessageBox.confirm('Подтвердить эту заявку?', 'Подтверждение', {
      confirmButtonText: 'Да, подтвердить',
      cancelButtonText: 'Нет',
      type: 'info'
    });
    
    await bookingStore.confirmBooking(id);
    await loadBookings(); // перезагружаем основной список
    
    // Обновляем текущую серию в модальном окне
    if (currentSeries.value.length > 0) {
      const recurringId = currentSeries.value[0].recurring_id;
      const updatedSeries = await bookingStore.fetchRecurring(recurringId);
      currentSeries.value = updatedSeries;
    }
  } catch (error) {
    // Пользователь отменил действие
  }
}

async function rejectBooking(id: number) {
  try {
    await ElMessageBox.confirm('Отклонить эту заявку?', 'Подтверждение', {
      confirmButtonText: 'Да, отклонить',
      cancelButtonText: 'Нет',
      type: 'warning'
    });
    
    await bookingStore.cancelBooking(id, 'tutor');
    await loadBookings();
    
    if (currentSeries.value.length > 0) {
      const recurringId = currentSeries.value[0].recurring_id;
      const updatedSeries = await bookingStore.fetchRecurring(recurringId);
      currentSeries.value = updatedSeries;
    }
  } catch (error) {
    // Пользователь отменил действие
  }
}

async function completeBooking(id: number) {
  try {
    await ElMessageBox.confirm('Отметить занятие как выполненное?', 'Подтверждение', {
      confirmButtonText: 'Да',
      cancelButtonText: 'Нет',
      type: 'info'
    });
    
    await bookingStore.completeBooking(id);
    await loadBookings();
    
    if (currentSeries.value.length > 0) {
      const recurringId = currentSeries.value[0].recurring_id;
      const updatedSeries = await bookingStore.fetchRecurring(recurringId);
      currentSeries.value = updatedSeries;
    }
  } catch (error) {
    // Пользователь отменил действие
  }
}

function rescheduleBooking(row: any) {
  ElMessage.info('Функция переноса будет доступна в Этапе 8');
}

function contactStudent(row: any) {
  ElMessage.info('Функция связи будет доступна позже');
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

.recurring-section {
  margin-bottom: 30px;
}

.recurring-section h3 {
  margin-bottom: 15px;
  color: #2c3e50;
  font-size: 18px;
}

.section-subtitle {
  margin: 25px 0 15px;
  color: #2c3e50;
  font-size: 18px;
}

.recurring-table {
  margin-bottom: 20px;
  background-color: #f9f9f9;
  border-radius: 8px;
}

:deep(.el-table) {
  width: 100% !important;
  margin-top: 10px;
}

:deep(.el-table__header th) {
  background-color: #f5f7fa;
  color: #2c3e50;
  font-weight: 600;
}

:deep(.el-table__row) {
  height: 60px;
}

.series-dialog {
  border-radius: 12px;
}

.series-dialog :deep(.el-dialog__body) {
  padding: 20px;
  max-height: 500px;
  overflow-y: auto;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* Убираем пустое пространство справа */
:deep(.el-table__inner-wrapper) {
  width: 100%;
}

:deep(.el-table__body-wrapper) {
  width: 100%;
}

:deep(.el-table__header-wrapper) {
  width: 100%;
}
</style>