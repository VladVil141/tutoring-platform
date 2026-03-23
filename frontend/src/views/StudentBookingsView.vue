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

      <!-- Регулярные серии -->
      <div v-if="filteredRecurringGroups.length" class="recurring-section">
        <h3>Регулярные занятия</h3>
        <el-table :data="filteredRecurringGroups" style="width: 100%" class="recurring-table" :show-header="true">
          <el-table-column label="Предмет" min-width="160">
            <template #default="{ row }">
              <strong>{{ row[0]?.listing?.subject }}</strong>
            </template>
          </el-table-column>
          <el-table-column label="Расписание" min-width="180">
            <template #default="{ row }">
              {{ row[0]?.recurring_pattern }} {{ row[0]?.time }}
            </template>
          </el-table-column>
          <el-table-column label="Репетитор" min-width="200">
            <template #default="{ row }">
              <div style="display: flex; align-items: center; gap: 8px;">
                <el-avatar :size="30" :src="row[0]?.listing?.tutor?.profile?.avatar_url">
                  {{ row[0]?.listing?.tutor?.profile?.first_name?.charAt(0) }}
                </el-avatar>
                <span>{{ row[0]?.listing?.tutor?.profile?.first_name }} {{ row[0]?.listing?.tutor?.profile?.last_name }}</span>
              </div>
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
          <el-table-column label="Действия" fixed="right" align="right" width="260">
            <template #default="{ row }">
              <div style="display: flex; gap: 8px; justify-content: flex-end;">
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
      <h3 v-if="filteredRecurringGroups.length" class="section-subtitle">Разовые занятия</h3>
      <el-table :data="filteredSingleBookings" v-loading="loading" style="width: 100%" :show-header="true">
        <el-table-column prop="date" label="Дата" width="120">
  <template #default="{ row }">
    {{ formatDisplayDate(row.date) }}
  </template>
</el-table-column>
        
        <el-table-column prop="time" label="Время" width="100" align="center" />
        
        <el-table-column prop="listing.subject" label="Предмет" min-width="150" />
        
        <el-table-column label="Репетитор" min-width="200">
          <template #default="{ row }">
            <div style="display: flex; align-items: center; gap: 8px;">
              <el-avatar :size="30" :src="row.listing?.tutor?.profile?.avatar_url">
                {{ row.listing?.tutor?.profile?.first_name?.charAt(0) }}
              </el-avatar>
              <span>{{ row.listing?.tutor?.profile?.first_name }} {{ row.listing?.tutor?.profile?.last_name }}</span>
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
        
        <el-table-column label="Действия" fixed="right" align="right" width="280">
          <template #default="{ row }">
            <div style="display: flex; gap: 8px; justify-content: flex-end;">
              <el-button 
                v-if="row.status === 'pending'"
                size="small" 
                type="danger" 
                @click="cancelBooking(row.id)"
                style="padding: 5px 15px;"
              >
                Отменить
              </el-button>
              <template v-else-if="row.status === 'confirmed'">
                <el-button 
                  size="small" 
                  type="warning" 
                  @click="contactTutor(row)"
                  style="padding: 5px 15px;"
                >
                  Связаться
                </el-button>
                <el-button 
                  size="small" 
                  type="primary" 
                  @click="rescheduleBooking(row)"
                  style="padding: 5px 15px;"
                  :disabled="true"
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

      <!-- Групповые занятия -->
      <div v-if="groupBookings.length" class="group-bookings-section">
        <h3>Групповые занятия</h3>
        <el-table :data="groupBookings" style="width: 100%" v-loading="groupLoading">
          <el-table-column prop="group_listing.subject" label="Предмет" min-width="150" />
          <el-table-column label="Расписание" min-width="150">
            <template #default="{ row }">
              {{ row.group_listing?.schedule }}
            </template>
          </el-table-column>
          <el-table-column label="Занятий" width="100" align="center">
            <template #default="{ row }">
              {{ getGroupLessonsCount(row) }}
            </template>
          </el-table-column>
          <el-table-column label="Репетитор" min-width="200">
            <template #default="{ row }">
              <div style="display: flex; align-items: center; gap: 8px;">
                <el-avatar :size="30" :src="row.group_listing?.tutor?.profile?.avatar_url">
                  {{ row.group_listing?.tutor?.profile?.first_name?.charAt(0) }}
                </el-avatar>
                <span>{{ row.group_listing?.tutor?.profile?.first_name }} {{ row.group_listing?.tutor?.profile?.last_name }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="Статус" width="130" align="center">
            <template #default="{ row }">
              <el-tag :type="getGroupStatusType(row.status)" size="small">
                {{ getGroupStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="Действия" width="220" fixed="right" align="right">
            <template #default="{ row }">
              <div style="display: flex; gap: 8px; justify-content: flex-end;">
                <el-button 
                  size="small" 
                  @click="showGroupSeries(row)"
                >
                  Подробнее
                </el-button>
                <el-button 
                  v-if="row.status === 'pending'"
                  size="small" 
                  type="danger" 
                  @click="cancelGroupBooking(row.id)"
                >
                  Отменить
                </el-button>
                <el-button 
                  v-else-if="row.status === 'approved'"
                  size="small" 
                  type="warning" 
                  @click="leaveGroup(row.group_listing_id)"
                >
                  Выйти
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <el-empty 
        v-if="!filteredSingleBookings.length && !filteredRecurringGroups.length && !groupBookings.length && !loading && !groupLoading" 
        description="У вас пока нет заявок" 
      />
    </el-card>

    <!-- Модальное окно с деталями регулярной серии -->
    <el-dialog v-model="seriesModalVisible" title="Детали серии" width="1000px" class="series-dialog">
      <el-table :data="currentSeries" style="width: 100%" :show-header="true">
        <el-table-column prop="date" label="Дата" width="140">
  <template #default="{ row }">
    {{ formatDisplayDate(row.date) }}
  </template>
</el-table-column>
        <el-table-column prop="time" label="Время" width="100" align="center" />
        <el-table-column label="Репетитор" min-width="200">
          <template #default="{ row }">
            <div style="display: flex; align-items: center; gap: 8px;">
              <el-avatar :size="30" :src="row.listing?.tutor?.profile?.avatar_url">
                {{ row.listing?.tutor?.profile?.first_name?.charAt(0) }}
              </el-avatar>
              <span>{{ row.listing?.tutor?.profile?.first_name }} {{ row.listing?.tutor?.profile?.last_name }}</span>
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
              <el-button 
                v-if="row.status === 'pending'"
                size="small" 
                type="danger" 
                @click="cancelBooking(row.id)"
                style="padding: 5px 15px;"
              >
                Отменить
              </el-button>
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

    <!-- Модальное окно с деталями групповой серии -->
    <el-dialog v-model="groupSeriesModalVisible" title="Расписание групповых занятий" width="700px" class="series-dialog">
      <el-table :data="groupCurrentSeries" style="width: 100%" v-loading="groupSeriesLoading" :show-header="true">
        <el-table-column prop="date" label="Дата" width="140">
  <template #default="{ row }">
    {{ formatDisplayDate(row.date) }}
  </template>
</el-table-column>
        <el-table-column prop="time" label="Время" width="100" align="center" />
        <el-table-column label="Статус" width="140" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small" effect="dark">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Действия" fixed="right" align="right" width="220">
          <template #default="{ row }">
            <div style="display: flex; gap: 8px; justify-content: flex-end;">
              <el-button 
                v-if="row.status === 'confirmed'"
                size="small" 
                type="primary" 
                @click="rescheduleGroupBooking(row)"
                :disabled="true"
                title="Функция будет доступна в Этапе 8"
              >
                Перенести
              </el-button>
              <el-button 
                v-if="row.status === 'confirmed'"
                size="small" 
                type="danger" 
                @click="cancelBooking(row.id)"
              >
                Отменить
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="groupSeriesModalVisible = false">Закрыть</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useBookingStore } from '../stores/booking';
import { useGroupBookingStore } from '../stores/groupBooking';
import { ElMessage, ElMessageBox } from 'element-plus';

const router = useRouter();
const bookingStore = useBookingStore();
const groupBookingStore = useGroupBookingStore();
const loading = ref(false);
const groupLoading = ref(false);
const groupSeriesLoading = ref(false);
const filterStatus = ref('');
const seriesModalVisible = ref(false);
const groupSeriesModalVisible = ref(false);
const currentSeries = ref<any[]>([]);
const groupCurrentSeries = ref<any[]>([]);

// Групповые заявки
const groupBookings = computed(() => groupBookingStore.myBookings);

// Подсчет количества занятий в группе
function getGroupLessonsCount(booking: any): number {
  const schedule = booking.group_listing?.schedule;
  const weeks = booking.group_listing?.weeks || 4;
  
  if (!schedule) return 0;
  
  const daysPart = schedule.split(' ')[0];
  const daysCount = daysPart.split('/').length;
  
  return daysCount * weeks;
}

// Регулярные серии
const recurringGroups = computed(() => {
  const groups: Record<string, any[]> = {};
  bookingStore.myBookings.forEach(booking => {
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

// Фильтрация регулярных серий
const filteredRecurringGroups = computed(() => {
  if (!filterStatus.value) return recurringGroups.value;
  return recurringGroups.value.filter(group => 
    group.some(booking => booking.status === filterStatus.value)
  );
});

// Разовые заявки
const singleBookings = computed(() => {
  return bookingStore.myBookings.filter(b => !b.recurring_id);
});

// Фильтрация разовых заявок
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
  return series.some(b => b.status === 'pending' || b.status === 'confirmed');
}

function showSeries(series: any[]) {
  currentSeries.value = series;
  seriesModalVisible.value = true;
}

async function showGroupSeries(groupBooking: any) {
  groupSeriesLoading.value = true;
  groupSeriesModalVisible.value = true;
  
  // Загружаем серию занятий из Booking по group_booking_id
  const series = await bookingStore.fetchGroupSeries(groupBooking.group_listing_id);
  groupCurrentSeries.value = series;
  groupSeriesLoading.value = false;
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

async function loadBookings() {
  loading.value = true;
  await bookingStore.fetchMyBookings();
  loading.value = false;
}

// Форматировать дату для отображения (ДД.ММ.ГГГГ)
function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
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

function getGroupStatusType(status: string) {
  const map: Record<string, string> = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger'
  };
  return map[status] || 'info';
}

function getGroupStatusText(status: string) {
  const map: Record<string, string> = {
    pending: 'Ожидание',
    approved: 'Принят',
    rejected: 'Отклонен'
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

async function cancelGroupBooking(id: number) {
  try {
    await ElMessageBox.confirm('Отменить заявку?', 'Подтверждение', {
      confirmButtonText: 'Да',
      cancelButtonText: 'Нет',
      type: 'warning'
    });
    
    await groupBookingStore.cancelBooking(id);
    await groupBookingStore.fetchMyBookings();
  } catch (error) {
    // Пользователь отменил действие
  }
}

async function leaveGroup(groupListingId: number) {
  try {
    await ElMessageBox.confirm('Выйти из группы?', 'Подтверждение', {
      confirmButtonText: 'Да',
      cancelButtonText: 'Нет',
      type: 'warning'
    });
    
    await groupBookingStore.leaveGroup(groupListingId);
    await groupBookingStore.fetchMyBookings();
  } catch (error) {
    // Пользователь отменил действие
  }
}

function contactTutor(row: any) {
  ElMessage.info('Функция связи будет доступна в Этапе 9');
}

function rescheduleBooking(row: any) {
  ElMessage.info('Функция переноса будет доступна в Этапе 8');
}

function rescheduleGroupBooking(row: any) {
  ElMessage.info('Функция переноса будет доступна в Этапе 8');
}

onMounted(async () => {
  await loadBookings();
  await groupBookingStore.fetchMyBookings();
});
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

.recurring-section h3,
.group-bookings-section h3 {
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

.group-bookings-section {
  margin-top: 30px;
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