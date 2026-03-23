<template>
  <div class="attendance-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <h2>Дневник посещений и оплат</h2>
          <div class="filters">
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="—"
              start-placeholder="Начало"
              end-placeholder="Конец"
              format="DD.MM.YYYY"
              value-format="YYYY-MM-DD"
              @change="loadAttendances"
              style="width: 260px;"
            />
            <el-select
              v-model="filterStudentId"
              placeholder="Все ученики"
              clearable
              @change="loadAttendances"
              style="width: 200px;"
            >
              <el-option
                v-for="student in students"
                :key="student.id"
                :label="student.name"
                :value="student.id"
              />
            </el-select>
            <el-button type="primary" @click="loadAttendances" :loading="loading">
              Применить
            </el-button>
            <el-button @click="resetFilters">Сбросить</el-button>
          </div>
        </div>
      </template>

      <el-table :data="attendances" v-loading="loading" style="width: 100%">
        <el-table-column prop="date" label="Дата" width="110">
          <template #default="{ row }">
            {{ formatDisplayDate(row.date) }}
          </template>
        </el-table-column>
        
        <el-table-column prop="time" label="Время" width="80" align="center" />
        
        <el-table-column label="Ученик" min-width="180">
          <template #default="{ row }">
            <div style="display: flex; align-items: center; gap: 8px;">
              <el-avatar :size="32" :src="row.student?.profile?.avatar_url">
                {{ row.student?.profile?.first_name?.charAt(0) }}
              </el-avatar>
              <span>{{ row.student?.profile?.first_name }} {{ row.student?.profile?.last_name }}</span>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="booking.listing.subject" label="Предмет" min-width="120" />
        
        <el-table-column label="Посетил" width="100" align="center">
          <template #default="{ row }">
            <el-checkbox
              :model-value="row.visited"
              @change="(val: boolean) => confirmUpdate(row, 'visited', val)"
            />
          </template>
        </el-table-column>
        
        <el-table-column label="Оплатил" width="100" align="center">
          <template #default="{ row }">
            <el-checkbox
              :model-value="row.paid"
              @change="(val: boolean) => confirmUpdate(row, 'paid', val)"
            />
          </template>
        </el-table-column>
        
        <el-table-column label="Заметки" min-width="200">
          <template #default="{ row }">
            <div class="notes-cell" @click="openNotesModal(row)">
              <span :class="{ 'notes-empty': !row.notes }">
                {{ row.notes || 'Добавить заметку...' }}
              </span>
              <el-icon class="edit-icon"><Edit /></el-icon>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!attendances.length && !loading" description="Нет записей" />
    </el-card>

    <!-- Модальное окно для заметок -->
    <el-dialog v-model="notesModalVisible" title="Заметки к занятию" width="500px">
      <el-input
        v-model="notesForm.text"
        type="textarea"
        :rows="5"
        placeholder="Тема занятия, домашнее задание, замечания..."
      />
      <template #footer>
        <el-button @click="notesModalVisible = false">Отмена</el-button>
        <el-button type="primary" @click="saveNotes" :loading="notesLoading">
          Сохранить
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAttendanceStore } from '../stores/attendance';
import { useAuthStore } from '../stores/auth';
import { Edit } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';

const router = useRouter();
const attendanceStore = useAttendanceStore();
const authStore = useAuthStore();

const loading = computed(() => attendanceStore.loading);
const attendances = computed(() => attendanceStore.attendances);

const dateRange = ref<[string, string] | null>(null);
const filterStudentId = ref<string | null>(null);
const notesModalVisible = ref(false);
const notesLoading = ref(false);
const currentAttendance = ref<any>(null);
const notesForm = ref({ text: '' });

// Список учеников для фильтра
const students = computed(() => {
  const unique = new Map();
  attendances.value.forEach(a => {
    if (a.student && !unique.has(a.student.id)) {
      unique.set(a.student.id, {
        id: a.student.id,
        name: `${a.student.profile.first_name} ${a.student.profile.last_name}`
      });
    }
  });
  return Array.from(unique.values());
});

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

async function loadAttendances() {
  const params: any = {};
  if (dateRange.value) {
    params.start_date = dateRange.value[0];
    params.end_date = dateRange.value[1];
  }
  if (filterStudentId.value) {
    params.student_id = filterStudentId.value;
  }
  await attendanceStore.fetchAttendances(params);
}

// Обновление с подтверждением
async function confirmUpdate(row: any, field: string, value: boolean) {
  const fieldName = field === 'visited' ? 'посещение' : 'оплату';
  const action = value ? 'отметить' : 'снять отметку';
  
  try {
    await ElMessageBox.confirm(
      `Вы уверены, что хотите ${action} ${fieldName}?`,
      'Подтверждение',
      {
        confirmButtonText: 'Да',
        cancelButtonText: 'Нет',
        type: 'info',
      }
    );
    
    await updateAttendance(row, field, value);
  } catch (error) {
    // Пользователь отменил действие — возвращаем чекбокс
    row[field] = !value;
  }
}

async function updateAttendance(row: any, field: string, value: boolean) {
  const updateData: any = {};
  updateData[field] = value;
  
  const result = await attendanceStore.updateAttendance(row.id, updateData);
  if (result) {
    row[field] = value;
    
    if (result.visited && result.paid) {
      ElMessage.success('Занятие отмечено как выполненное и оплаченное');
    } else {
      ElMessage.success(`Отметка "${field === 'visited' ? 'посещение' : 'оплата'}" сохранена`);
    }
  }
}

function openNotesModal(row: any) {
  currentAttendance.value = row;
  notesForm.value.text = row.notes || '';
  notesModalVisible.value = true;
}

async function saveNotes() {
  if (!currentAttendance.value) return;
  
  notesLoading.value = true;
  const result = await attendanceStore.updateAttendance(currentAttendance.value.id, {
    notes: notesForm.value.text
  });
  notesLoading.value = false;
  
  if (result) {
    currentAttendance.value.notes = notesForm.value.text;
    notesModalVisible.value = false;
    ElMessage.success('Заметки сохранены');
  }
}

function resetFilters() {
  dateRange.value = null;
  filterStudentId.value = null;
  loadAttendances();
}

onMounted(async () => {
  if (!authStore.isAuthenticated || !authStore.isTutor) {
    router.push('/');
    return;
  }
  await loadAttendances();
});
</script>

<style scoped>
.attendance-container {
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

.filters {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.notes-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: #409eff;
}

.notes-cell span {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notes-empty {
  color: #c0c4cc;
  font-style: italic;
}

.edit-icon {
  opacity: 0.5;
  transition: opacity 0.2s;
}

.notes-cell:hover .edit-icon {
  opacity: 1;
}

:deep(.el-table) {
  margin-top: 10px;
}

:deep(.el-table__header th) {
  background-color: #f5f7fa;
  color: #2c3e50;
  font-weight: 600;
}
</style>