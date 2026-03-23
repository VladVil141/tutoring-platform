<template>
  <div class="schedule-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <h2>Календарь занятий</h2>
          <div class="view-controls">
            <el-radio-group v-model="view" @change="loadSchedule">
              <el-radio value="day">День</el-radio>
              <el-radio value="week">Неделя</el-radio>
              <el-radio value="month">Месяц</el-radio>
            </el-radio-group>
            <div class="date-nav">
              <el-button @click="prevPeriod" :icon="ArrowLeft" circle />
              <span class="current-date">{{ currentDateLabel }}</span>
              <el-button @click="nextPeriod" :icon="ArrowRight" circle />
              <el-button @click="today" type="primary" size="small">Сегодня</el-button>
            </div>
          </div>
        </div>
      </template>

      <div v-loading="loading" class="calendar-content">
        <!-- День -->
        <div v-if="view === 'day'" class="day-view">
          <div class="day-header">
            <h3>{{ formatDisplayDate(getUTCDateString(selectedDate)) }}</h3>
          </div>
          <div class="day-events">
            <div v-for="hour in hours" :key="hour" class="hour-row">
              <div class="hour-label">{{ hour }}:00</div>
              <div class="hour-events">
                <div
                  v-for="event in getEventsByHour(hour)"
                  :key="event.id"
                  class="event-card"
                  :class="getEventClass(event)"
                  @click="goToEvent(event)"
                >
                  <div class="event-time">{{ event.time }}</div>
                  <div class="event-title">{{ event.subject }}</div>
                  <div class="event-info">
                    <span v-if="event.type === 'individual'">
                      {{ isStudent ? event.tutor_name : event.student_name }}
                    </span>
                    <span v-else class="group-badge">Группа</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Неделя -->
        <div v-else-if="view === 'week'" class="week-view">
          <div class="week-header">
            <div v-for="day in weekDays" :key="day.date" class="week-day">
              <div class="day-name">{{ day.name }}</div>
              <div class="day-date">{{ formatDisplayDate(day.date) }}</div>
            </div>
          </div>
          <div class="week-body">
            <div v-for="hour in hours" :key="hour" class="week-hour">
              <div class="hour-label">{{ hour }}:00</div>
              <div class="week-events">
                <div
                  v-for="day in weekDays"
                  :key="day.date"
                  class="day-events-cell"
                >
                  <div
                    v-for="event in getEventsByDateAndHour(day.date, hour)"
                    :key="event.id"
                    class="event-card small"
                    :class="getEventClass(event)"
                    @click="goToEvent(event)"
                  >
                    <div class="event-time">{{ event.time }}</div>
                    <div class="event-title">{{ event.subject }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Месяц -->
<div v-else class="month-view">
  <div class="month-header">
    <div v-for="day in weekNames" :key="day" class="month-day-name">{{ day }}</div>
  </div>
  <div class="month-grid">
    <div
      v-for="day in monthDays"
      :key="day.date"
      class="month-day"
      :class="{ 'other-month': !day.isCurrentMonth }"
      @click="selectDate(day.date)"
    >
      <div class="day-number">{{ day.dayNum }}</div>
      <div class="day-events">
        <div
          v-for="event in getEventsByDate(day.date)"
          :key="event.id"
          class="event-dot"
          :class="{
            'event-pending': event.type === 'individual' && event.status === 'pending',
            'event-confirmed': (event.type === 'individual' && event.status === 'confirmed') || event.type === 'group',
            'event-completed': event.type === 'individual' && event.status === 'completed'
          }"
          :title="`${event.subject} ${event.time}`"
        ></div>
      </div>
    </div>
  </div>
</div>

        <el-empty v-if="!events.length && !loading" description="Нет занятий" />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useScheduleStore } from '../stores/schedule';
import { useAuthStore } from '../stores/auth';
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue';

const router = useRouter();
const scheduleStore = useScheduleStore();
const authStore = useAuthStore();

const view = ref<'day' | 'week' | 'month'>('week');
const selectedDate = ref(new Date());
const loading = computed(() => scheduleStore.loading);
const events = computed(() => scheduleStore.events);

const isStudent = computed(() => authStore.isStudent);
const isTutor = computed(() => authStore.isTutor);

// Часы (с 8:00 до 22:00)
const hours = Array.from({ length: 15 }, (_, i) => i + 8);

// Названия дней
const weekNames = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];

// Форматирование даты для отображения (ДД.ММ.ГГГГ)
function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

// Получить дату в формате YYYY-MM-DD (UTC)
function getUTCDateString(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

// Получить час из времени
function getEventHour(time: string): number {
  if (!time) return 0;
  const hourStr = time.substring(0, 2);
  const hour = parseInt(hourStr, 10);
  return isNaN(hour) ? 0 : hour;
}

// Получить события по дате
function getEventsByDate(date: string | undefined): any[] {
  if (!date) return [];
  const dateStr = date as string;
  return events.value.filter(e => e.date === dateStr);
}

// Получить события по дате и часу
function getEventsByDateAndHour(date: string | undefined, hour: number): any[] {
  if (!date) return [];
  const dateStr = date as string;
  return events.value.filter(e => {
    if (e.date !== dateStr) return false;
    const eventHour = getEventHour(e.time);
    return eventHour === hour;
  });
}

// Получить события по часу (для дня)
function getEventsByHour(hour: number): any[] {
  return events.value.filter(e => getEventHour(e.time) === hour);
}

// Форматирование даты для отображения в шапке
function formatDate(date: Date, format: 'day' | 'full' = 'day'): string {
  if (format === 'day') {
    return `${date.getDate()}.${date.getMonth() + 1}`;
  }
  return date.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
}

// Текущая дата для отображения
const currentDateLabel = computed(() => {
  if (view.value === 'day') {
    return formatDate(selectedDate.value, 'full');
  }
  if (view.value === 'week') {
    const start = getWeekStartUTC(selectedDate.value);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    return `${formatDisplayDate(getUTCDateString(start))} - ${formatDisplayDate(getUTCDateString(end))}`;
  }
  return selectedDate.value.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
});

// Получить начало недели в UTC
function getWeekStartUTC(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = (day === 0 ? 6 : day - 1);
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

// Дни недели для отображения
const weekDays = computed(() => {
  const start = getWeekStartUTC(selectedDate.value);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + i);
    days.push({
      date: getUTCDateString(date),
      name: weekNames[i],
      dateNum: date.getUTCDate(),
    });
  }
  return days;
});

// Дни месяца
const monthDays = computed(() => {
  const year = selectedDate.value.getUTCFullYear();
  const month = selectedDate.value.getUTCMonth();
  const firstDay = new Date(Date.UTC(year, month, 1));
  const lastDay = new Date(Date.UTC(year, month + 1, 0));
  const startWeekday = firstDay.getUTCDay() || 7;
  const days: any[] = [];
  
  // Дни предыдущего месяца
  const prevMonthLastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  for (let i = startWeekday - 1; i > 0; i--) {
    const date = new Date(Date.UTC(year, month - 1, prevMonthLastDay - i + 1));
    days.push({
      date: getUTCDateString(date),
      dayNum: date.getUTCDate(),
      isCurrentMonth: false,
    });
  }
  
  // Дни текущего месяца
  for (let i = 1; i <= lastDay.getUTCDate(); i++) {
    const date = new Date(Date.UTC(year, month, i));
    days.push({
      date: getUTCDateString(date),
      dayNum: i,
      isCurrentMonth: true,
    });
  }
  
  return days;
});

// Класс для события (только желтый и зеленый)
function getEventClass(event: any): string {
  if (event.type === 'individual') {
    if (event.status === 'pending') return 'event-pending';
    if (event.status === 'confirmed') return 'event-confirmed';
    if (event.status === 'completed') return 'event-completed';
  }
  if (event.type === 'group') {
    // Групповые всегда считаем подтвержденными (зеленые)
    return 'event-confirmed';
  }
  return '';
}

// Получить текущую дату в UTC строке
function getTodayUTC(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
}

// Переход к деталям события
function goToEvent(event: any) {
  if (event.type === 'individual') {
    router.push(`/bookings/${event.id}`);
  } else {
    router.push(`/group-listings/${event.id}`);
  }
}

// Навигация
function prevPeriod() {
  if (view.value === 'day') {
    const newDate = new Date(selectedDate.value);
    newDate.setUTCDate(selectedDate.value.getUTCDate() - 1);
    selectedDate.value = newDate;
  } else if (view.value === 'week') {
    const newDate = new Date(selectedDate.value);
    newDate.setUTCDate(selectedDate.value.getUTCDate() - 7);
    selectedDate.value = newDate;
  } else {
    const newDate = new Date(selectedDate.value);
    newDate.setUTCMonth(selectedDate.value.getUTCMonth() - 1);
    selectedDate.value = newDate;
  }
  loadSchedule();
}

function nextPeriod() {
  if (view.value === 'day') {
    const newDate = new Date(selectedDate.value);
    newDate.setUTCDate(selectedDate.value.getUTCDate() + 1);
    selectedDate.value = newDate;
  } else if (view.value === 'week') {
    const newDate = new Date(selectedDate.value);
    newDate.setUTCDate(selectedDate.value.getUTCDate() + 7);
    selectedDate.value = newDate;
  } else {
    const newDate = new Date(selectedDate.value);
    newDate.setUTCMonth(selectedDate.value.getUTCMonth() + 1);
    selectedDate.value = newDate;
  }
  loadSchedule();
}

function today() {
  const now = new Date();
  selectedDate.value = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  loadSchedule();
}

function selectDate(dateStr: string | undefined) {
  if (!dateStr) return;
  
  // Приводим к строке
  const dateString = dateStr as string;
  const parts = dateString.split('-');
  
  if (parts.length !== 3) return;
  
  const year = parseInt(parts[0] as string, 10);
  const month = parseInt(parts[1] as string, 10);
  const day = parseInt(parts[2] as string, 10);
  
  if (isNaN(year) || isNaN(month) || isNaN(day)) return;
  
  selectedDate.value = new Date(Date.UTC(year, month - 1, day));
  view.value = 'day';
  loadSchedule();
}

async function loadSchedule() {
  let startDate: Date, endDate: Date;
  
  if (view.value === 'day') {
    startDate = selectedDate.value;
    endDate = selectedDate.value;
  } else if (view.value === 'week') {
    startDate = getWeekStartUTC(selectedDate.value);
    endDate = new Date(startDate);
    endDate.setUTCDate(startDate.getUTCDate() + 6);
  } else {
    startDate = new Date(Date.UTC(selectedDate.value.getUTCFullYear(), selectedDate.value.getUTCMonth(), 1));
    endDate = new Date(Date.UTC(selectedDate.value.getUTCFullYear(), selectedDate.value.getUTCMonth() + 1, 0));
  }
  
  await scheduleStore.fetchSchedule({
    start_date: getUTCDateString(startDate),
    end_date: getUTCDateString(endDate),
    view: view.value,
  });
  
  // Фильтруем прошедшие даты на фронтенде
  const todayUTC = getTodayUTC();
  
  scheduleStore.events = scheduleStore.events.filter(event => {
    // Пропускаем прошедшие даты
    if (event.date < todayUTC) return false;
    return true;
  });
}

onMounted(() => {
  loadSchedule();
});
</script>

<style scoped>
.schedule-container {
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

.view-controls {
  display: flex;
  align-items: center;
  gap: 15px;
}

.date-nav {
  display: flex;
  align-items: center;
  gap: 8px;
}

.current-date {
  font-weight: 500;
  min-width: 200px;
  text-align: center;
}

.calendar-content {
  margin-top: 20px;
}

/* Day View */
.day-view {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
}

.day-header {
  background: #f5f7fa;
  padding: 12px;
  text-align: center;
  border-bottom: 1px solid #e4e7ed;
}

.hour-row {
  display: flex;
  border-bottom: 1px solid #e4e7ed;
  min-height: 80px;
}

.hour-label {
  width: 70px;
  padding: 8px;
  background: #fafafa;
  border-right: 1px solid #e4e7ed;
  font-size: 12px;
  color: #666;
}

.hour-events {
  flex: 1;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Week View */
.week-view {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow-x: auto;
}

.week-header {
  display: flex;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
}

.week-day {
  flex: 1;
  text-align: center;
  padding: 12px;
}

.day-name {
  font-weight: 500;
}

.day-date {
  font-size: 12px;
  color: #666;
}

.week-body {
  min-width: 700px;
}

.week-hour {
  display: flex;
  border-bottom: 1px solid #e4e7ed;
  min-height: 80px;
}

.week-events {
  flex: 1;
  display: flex;
}

.day-events-cell {
  flex: 1;
  padding: 8px;
  border-left: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* Month View */
.month-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: #f5f7fa;
  text-align: center;
  padding: 12px;
  border-bottom: 1px solid #e4e7ed;
}

.month-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.month-day {
  min-height: 100px;
  padding: 8px;
  border-bottom: 1px solid #e4e7ed;
  border-right: 1px solid #e4e7ed;
  cursor: pointer;
  transition: background 0.2s;
}

.month-day:hover {
  background: #f5f7fa;
}

.month-day.other-month {
  background: #fafafa;
  color: #999;
}

.day-number {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
}

.day-events {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.event-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

/* Event Cards */
.event-card {
  background: white;
  border-left: 4px solid;
  padding: 8px 12px;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  cursor: pointer;
  transition: transform 0.2s;
}

.event-card:hover {
  transform: translateX(4px);
}

.event-card.small {
  padding: 4px 8px;
  font-size: 12px;
}

.event-time {
  font-size: 12px;
  color: #666;
}

.event-title {
  font-weight: 500;
  margin: 4px 0;
}

.event-info {
  font-size: 11px;
  color: #999;
}

.event-pending {
  border-left-color: #e6a23c;
}
.event-confirmed {
  border-left-color: #67c23a;
}
.event-completed {
  border-left-color: #909399;
}

.group-badge {
  background: #409eff;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
}

.event-dot.event-pending { background: #e6a23c; }  /* желтый */
.event-dot.event-confirmed { background: #67c23a; } /* зеленый */
.event-dot.event-completed { background: #909399; } /* серый */
</style>