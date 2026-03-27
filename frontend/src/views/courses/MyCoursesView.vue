<template>
  <div class="my-courses">
    <el-card>
      <template #header>
        <div class="card-header">
          <h2>Мои курсы</h2>
          <el-button v-if="isTutor" type="primary" @click="showCreateDialog = true">
            + Создать курс
          </el-button>
        </div>
      </template>

      <div v-if="loading" class="loading">
        <el-skeleton :rows="3" animated />
      </div>

      <div v-else-if="courses.length === 0" class="empty">
        <el-empty description="У вас пока нет курсов">
          <el-button v-if="isTutor" type="primary" @click="showCreateDialog = true">
            Создать первый курс
          </el-button>
        </el-empty>
      </div>

      <div v-else class="courses-grid">
        <el-card 
          v-for="course in courses" 
          :key="course.id" 
          class="course-card"
          @click="goToCourse(course.id)"
        >
          <div class="course-header">
            <h3>{{ course.title }}</h3>
            <el-tag :type="course.is_active ? 'success' : 'info'" size="small">
              {{ course.is_active ? 'Активен' : 'Архив' }}
            </el-tag>
          </div>
          <p class="course-description">{{ course.description || 'Нет описания' }}</p>
          <div class="course-stats">
            <span>📚 {{ course.sections?.length || 0 }} разделов</span>
            <span v-if="!isTutor && course.enrollments?.[0]?.completed_at">✅ Завершен</span>
            <span v-else-if="!isTutor">📖 В процессе</span>
          </div>
          <div class="course-footer">
            <span class="course-date">Создан: {{ formatDate(course.created_at) }}</span>
            <el-button v-if="isTutor" text type="primary" @click.stop="copyInviteLink(course)">
              🔗 Скопировать ссылку
            </el-button>
          </div>
        </el-card>
      </div>
    </el-card>

    <!-- Диалог создания курса -->
    <el-dialog v-model="showCreateDialog" title="Создать курс" width="500px">
      <el-form :model="newCourse" label-width="80px">
        <el-form-item label="Название" required>
          <el-input v-model="newCourse.title" placeholder="Введите название курса" />
        </el-form-item>
        <el-form-item label="Описание">
          <el-input 
            v-model="newCourse.description" 
            type="textarea" 
            :rows="3"
            placeholder="Опишите, о чем этот курс"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">Отмена</el-button>
        <el-button type="primary" @click="createCourse" :loading="creating">
          Создать
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useCourseStore } from '../../stores/course';
import { useAuthStore } from '../../stores/auth';
import { ElMessage } from 'element-plus';

const router = useRouter();
const courseStore = useCourseStore();
const authStore = useAuthStore();

const isTutor = computed(() => authStore.isTutor);
const loading = computed(() => courseStore.loading);

// Нормализуем данные для отображения
const courses = computed(() => {
  const data = courseStore.myCourses;
  if (!data || !Array.isArray(data)) return [];
  
  return data.map((item: any) => {
    // Если это enrollment (ученик)
    if (item.course) {
      return {
        ...item.course,
        enrollment_id: item.id,
        enrolled_at: item.enrolled_at
      };
    }
    // Если это уже курс (репетитор)
    return item;
  });
});

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ru-RU');
}

function goToCourse(courseId: number) {
  router.push(`/courses/${courseId}`);
}

async function copyInviteLink(course: any) {
  const link = await courseStore.getInviteLink(course.id);
  if (link) {
    await navigator.clipboard.writeText(link);
    ElMessage.success('Ссылка скопирована в буфер обмена');
  }
}

async function createCourse() {
  if (!newCourse.value.title.trim()) {
    ElMessage.warning('Введите название курса');
    return;
  }
  
  creating.value = true;
  const course = await courseStore.createCourse(newCourse.value);
  creating.value = false;
  
  if (course) {
    showCreateDialog.value = false;
    newCourse.value = { title: '', description: '' };
    goToCourse(course.id);
  }
}

onMounted(async () => {
  await courseStore.fetchMyCourses();
});
</script>

<style scoped>
.my-courses {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.courses-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.course-card {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.course-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.course-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.course-header h3 {
  margin: 0;
  font-size: 18px;
  color: #2c3e50;
}

.course-description {
  color: #666;
  font-size: 14px;
  margin: 10px 0;
  min-height: 60px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.course-stats {
  display: flex;
  gap: 15px;
  font-size: 12px;
  color: #909399;
  margin: 12px 0;
}

.course-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #eee;
}

.course-date {
  font-size: 11px;
  color: #c0c4cc;
}

.loading, .empty {
  padding: 40px;
  text-align: center;
}
</style>