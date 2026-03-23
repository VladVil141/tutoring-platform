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

      <!-- Блок новых запросов на перенос -->
      <div v-if="pendingReschedules.length" class="reschedule-block">
        <el-alert type="warning" :closable="false" show-icon>
          <template #title>
            <span>Новые запросы на перенос ({{ pendingReschedules.length }})</span>
          </template>
        </el-alert>
        
        <div v-for="req in pendingReschedules" :key="req.id" class="reschedule-item">
          <div class="reschedule-info">
            <strong>{{ req.booking?.listing?.subject }}</strong>
            <p>Ученик: {{ req.booking?.student?.profile?.first_name }} {{ req.booking?.student?.profile?.last_name }}</p>
            <p>Было: {{ formatDisplayDate(req.old_date) }} {{ req.old_time }}</p>
            <p>Стало: {{ formatDisplayDate(req.new_date) }} {{ req.new_time }}</p>
            <p>Инициатор: {{ req.requested_by === 'student' ? 'Ученик' : 'Вы' }}</p>
            <p v-if="req.reason" class="reason">Причина: {{ req.reason }}</p>
          </div>
          <div class="reschedule-actions">
            <el-button size="small" type="success" @click="confirmReschedule(req.id)">
              Подтвердить
            </el-button>
            <el-button size="small" type="danger" @click="rejectReschedule(req.id)">
              Отклонить
            </el-button>
          </div>
        </div>
      </div>

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
          <el-table-column label="Действия" fixed="right" align="right" width="320">
            <template #default="{ row }">
              <div style="display: flex; gap: 8px; justify-content: flex-end;">
                <el-button size="small" @click="showSeries(row)">
                  Подробнее
                </el-button>
                <el-button 
                  size="small" 
                  type="warning" 
                  @click="contactStudent(row)"
                  style="padding: 5px 15px;"
                >
                  Связаться
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
                  @click="openRescheduleModal(row)"
                >
                  Перенести
                </el-button>
              </template>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- Групповые занятия -->
      <div v-if="groupBookings.length" class="group-bookings-section">
        <h3>Групповые занятия</h3>
        <el-table :data="groupBookings" style="width: 100%" v-loading="groupLoading">
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
          <el-table-column label="Статус" width="130" align="center">
            <template #default="{ row }">
              <el-tag :type="getGroupStatusType(row.status)" size="small">
                {{ getGroupStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="Действия" fixed="right" align="right" width="330">
            <template #default="{ row }">
              <div style="display: flex; gap: 8px; justify-content: flex-end;">
                <el-button 
                  size="small" 
                  @click="showGroupSeries(row)"
                >
                  Расписание
                </el-button>
                <el-button 
                  v-if="row.status === 'pending'"
                  size="small" 
                  type="success" 
                  @click="approveGroupBooking(row.id)"
                >
                  Одобрить
                </el-button>
                <el-button 
                  v-if="row.status === 'pending'"
                  size="small" 
                  type="danger" 
                  @click="rejectGroupBooking(row.id)"
                >
                  Отклонить
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <el-empty 
        v-if="!filteredSingleBookings.length && !filteredRecurringGroups.length && !groupBookings.length && !loading && !groupLoading" 
        description="Заявок пока нет" 
      />
    </el-card>

    <!-- Модальное окно с деталями регулярной серии -->
    <el-dialog v-model="seriesModalVisible" title="Детали серии" width="1100px" class="series-dialog">
      <el-table :data="currentSeries" style="width: 100%" :show-header="true">
        <el-table-column prop="date" label="Дата" width="140">
          <template #default="{ row }">
            {{ formatDisplayDate(row.date) }}
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
        <el-table-column label="Действия" fixed="right" align="right" width="240">
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
          type="warning" 
          @click="openRescheduleModal(row)"
          style="padding: 5px 15px;"
        >
          Перенести
        </el-button>
      </template>
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

    <!-- Модальное окно с расписанием групповых занятий -->
    <el-dialog v-model="groupSeriesModalVisible" title="Расписание групповых занятий" width="900px" class="series-dialog">
      <el-table :data="groupCurrentSeries" style="width: 100%" v-loading="groupSeriesLoading" :show-header="true">
        <el-table-column prop="date" label="Дата" width="140">
          <template #default="{ row }">
            {{ formatDisplayDate(row.date) }}
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
        <el-table-column label="Статус" width="140" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small" effect="dark">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Действия" fixed="right" align="right" width="240">
  <template #default="{ row }">
    <div style="display: flex; gap: 8px; justify-content: flex-end;">
      <el-button 
        v-if="row.status === 'confirmed'"
        size="small" 
        type="primary" 
        @click="completeBooking(row.id)"
        style="padding: 5px 15px;"
      >
        Завершить
      </el-button>
      <el-button 
        v-if="row.status === 'confirmed'"
        size="small" 
        type="warning" 
        @click="openRescheduleModal(row)"
        style="padding: 5px 15px;"
      >
        Перенести
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

    <!-- Модальное окно переноса занятия -->
    <el-dialog v-model="rescheduleModalVisible" title="Перенос занятия" width="450px">
      <el-form :model="rescheduleForm" label-width="100px">
        <el-form-item label="Новая дата">
          <el-date-picker 
            v-model="rescheduleForm.new_date" 
            type="date" 
            placeholder="Выберите дату"
            format="DD.MM.YYYY"
            value-format="YYYY-MM-DD"
            :disabled-date="disabledDate"
            style="width: 100%;"
          />
        </el-form-item>
        
        <el-form-item label="Новое время">
          <el-time-select
            v-model="rescheduleForm.new_time"
            start="08:00"
            step="01:00"
            end="22:00"
            format="HH:mm"
            value-format="HH:mm"
            placeholder="Выберите время"
            style="width: 100%;"
          />
        </el-form-item>
        
        <el-form-item label="Причина">
          <el-input 
            v-model="rescheduleForm.reason" 
            type="textarea" 
            :rows="2"
            placeholder="Укажите причину переноса (необязательно)"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="rescheduleModalVisible = false">Отмена</el-button>
        <el-button type="primary" @click="submitReschedule" :loading="rescheduleLoading">
          Отправить запрос
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useChatStore } from '../stores/chat';
import { useBookingStore } from '../stores/booking';
import { useGroupBookingStore } from '../stores/groupBooking';
import { bookingService } from '../services/api';
import { ElMessage, ElMessageBox } from 'element-plus';

const router = useRouter();
const chatStore = useChatStore();
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

// Переносы
const pendingReschedules = ref<any[]>([]);
const rescheduleModalVisible = ref(false);
const rescheduleLoading = ref(false);
const rescheduleBooking = ref<any>(null);
const rescheduleForm = ref({
  new_date: '',
  new_time: '',
  reason: ''
});

// Запрет на прошедшие даты
function disabledDate(time: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return time.getTime() < today.getTime();
}

// Форматирование даты
function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

// Загрузить ожидающие запросы
async function loadPendingReschedules() {
  try {
    const response = await bookingService.getPendingReschedules();
    pendingReschedules.value = response.data;
  } catch (error) {
    console.error('Ошибка загрузки запросов');
  }
}

async function confirmReschedule(id: number) {
  try {
    await ElMessageBox.confirm('Подтвердить перенос?', 'Подтверждение', {
      confirmButtonText: 'Да',
      cancelButtonText: 'Нет',
      type: 'info'
    });
    
    await bookingService.confirmReschedule(id);
    await loadPendingReschedules();
    await loadBookings();
    ElMessage.success('Перенос подтвержден');
  } catch (error) {
    // пользователь отменил
  }
}

async function rejectReschedule(id: number) {
  try {
    await ElMessageBox.confirm('Отклонить перенос?', 'Подтверждение', {
      confirmButtonText: 'Да',
      cancelButtonText: 'Нет',
      type: 'warning'
    });
    
    await bookingService.rejectReschedule(id);
    await loadPendingReschedules();
    await loadBookings();
    ElMessage.success('Перенос отклонен');
  } catch (error) {
    // пользователь отменил
  }
}

function openRescheduleModal(booking: any) {
  rescheduleBooking.value = booking;
  rescheduleForm.value = {
    new_date: '',
    new_time: '',
    reason: ''
  };
  rescheduleModalVisible.value = true;
}

async function submitReschedule() {
  if (!rescheduleForm.value.new_date || !rescheduleForm.value.new_time) {
    ElMessage.warning('Выберите новую дату и время');
    return;
  }
  
  rescheduleLoading.value = true;
  
  try {
    await bookingService.createReschedule({
      booking_id: rescheduleBooking.value.id,
      new_date: rescheduleForm.value.new_date,
      new_time: rescheduleForm.value.new_time,
      reason: rescheduleForm.value.reason
    });
    
    ElMessage.success('Запрос на перенос отправлен');
    rescheduleModalVisible.value = false;
    await loadBookings();
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || 'Ошибка отправки запроса');
  } finally {
    rescheduleLoading.value = false;
  }
}

// Групповые заявки
const groupBookings = computed(() => groupBookingStore.tutorBookings);

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

// Фильтрация регулярных серий
const filteredRecurringGroups = computed(() => {
  if (!filterStatus.value) return recurringGroups.value;
  return recurringGroups.value.filter(group => 
    group.some(booking => booking.status === filterStatus.value)
  );
});

// Разовые заявки
const singleBookings = computed(() => {
  return bookingStore.tutorBookings.filter(b => !b.recurring_id);
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
  
  const series = await bookingStore.fetchGroupSeriesForTutor(groupBooking.group_listing_id);
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
  await bookingStore.fetchTutorBookings();
  loading.value = false;
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

async function confirmBooking(id: number) {
  try {
    await ElMessageBox.confirm('Подтвердить эту заявку?', 'Подтверждение', {
      confirmButtonText: 'Да, подтвердить',
      cancelButtonText: 'Нет',
      type: 'info'
    });
    
    await bookingStore.confirmBooking(id);
    await loadBookings();
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
  } catch (error) {
    // Пользователь отменил действие
  }
}

async function approveGroupBooking(id: number) {
  try {
    await ElMessageBox.confirm('Одобрить заявку в группу?', 'Подтверждение', {
      confirmButtonText: 'Да',
      cancelButtonText: 'Нет',
      type: 'info'
    });
    
    await groupBookingStore.approveBooking(id);
    await groupBookingStore.fetchTutorBookings();
  } catch (error) {
    // Пользователь отменил действие
  }
}

async function rejectGroupBooking(id: number) {
  try {
    await ElMessageBox.confirm('Отклонить заявку в группу?', 'Подтверждение', {
      confirmButtonText: 'Да',
      cancelButtonText: 'Нет',
      type: 'warning'
    });
    
    await groupBookingStore.rejectBooking(id);
    await groupBookingStore.fetchTutorBookings();
  } catch (error) {
    // Пользователь отменил действие
  }
}

async function contactStudent(booking: any) {
  const studentId = booking.student_id;
  if (!studentId) return;
  
  const chat = await chatStore.createPrivateChat(studentId);
  if (chat) {
    router.push(`/chat/private/${chat.id}`);
  }
}

onMounted(async () => {
  await loadBookings();
  await groupBookingStore.fetchTutorBookings();
  await loadPendingReschedules();
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

/* Блок запросов на перенос */
.reschedule-block {
  background-color: #fef0e6;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
  border-left: 4px solid #e6a23c;
}

.reschedule-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.reschedule-item:last-child {
  border-bottom: none;
}

.reschedule-info {
  flex: 1;
}

.reschedule-info strong {
  font-size: 16px;
  color: #2c3e50;
}

.reschedule-info p {
  margin: 5px 0;
  font-size: 14px;
  color: #666;
}

.reschedule-info .reason {
  font-style: italic;
  color: #999;
}

.reschedule-actions {
  display: flex;
  gap: 10px;
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