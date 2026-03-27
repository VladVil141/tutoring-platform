<template>
  <div class="course-detail">
    <el-card v-loading="loading">
      <template #header>
        <div class="card-header">
          <div style="display: flex; align-items: center; gap: 15px;">
            <el-button @click="$router.back()" text>
              <el-icon><ArrowLeft /></el-icon> Назад
            </el-button>
            <h2>{{ course?.title }}</h2>
          </div>
          <div v-if="isTutor && isOwner" class="actions">
            <el-button type="warning" @click="copyInviteLink">
              🔗 Скопировать ссылку
            </el-button>
            <el-button type="danger" plain @click="deleteCourse">
              Удалить курс
            </el-button>
          </div>
        </div>
      </template>

      <div v-if="course" class="course-content">
        <div class="course-description">
          <h3>Описание курса</h3>
          <p>{{ course.description || 'Нет описания' }}</p>
          <div class="course-meta">
            <span>👨‍🏫 {{ course.tutor?.profile?.first_name || '' }} {{ course.tutor?.profile?.last_name || '' }}</span>
            <span>📅 Создан: {{ formatDate(course.created_at) }}</span>
            <span>📚 {{ course.sections?.length || 0 }} разделов</span>
            <span v-if="!isTutor && isEnrolled">✅ Вы записаны на курс</span>
          </div>
        </div>

        <div class="sections">
          <div class="sections-header">
            <h3>Содержание курса</h3>
            <el-button v-if="isOwner" type="primary" size="small" @click="showAddSectionDialog = true">
              + Добавить секцию
            </el-button>
          </div>

          <div v-if="!course.sections?.length" class="empty-sections">
            <el-empty description="Пока нет разделов" />
          </div>

          <div v-else class="sections-list">
            <el-collapse v-model="activeSections">
              <el-collapse-item 
                v-for="section in sortedSections" 
                :key="section.id" 
                :name="section.id"
              >
                <template #title>
                  <div class="section-title">
                    <span class="section-icon">{{ getSectionIcon(section.type) }}</span>
                    <span>{{ section.title }}</span>
                    <el-tag :type="getSectionTagType(section.type)" size="small" style="margin-left: 12px;">
                      {{ getSectionTypeText(section.type) }}
                    </el-tag>
                  </div>
                  <div v-if="isOwner" class="section-actions" @click.stop>
                    <el-button size="small" text type="danger" @click="deleteSection(section.id)">
                      Удалить
                    </el-button>
                  </div>
                </template>

                <!-- Материалы -->
                <div v-if="section.type === 'materials'" class="section-content">
                  <div v-if="isOwner" class="add-material">
                    <el-upload
                      :action="`http://localhost:3000/courses/sections/${section.id}/materials`"
                      :headers="{ Authorization: `Bearer ${token}` }"
                      :on-success="() => reloadCourse()"
                      :on-error="handleUploadError"
                      :show-file-list="false"
                    >
                      <el-button size="small" type="primary">
                        + Загрузить материал
                      </el-button>
                    </el-upload>
                  </div>

                  <div v-if="section.materials?.length" class="materials-list">
                    <div v-for="material in section.materials" :key="material.id" class="material-item">
                      <el-icon><Document /></el-icon>
                      <a :href="`http://localhost:3000${material.file_url}`" target="_blank" class="material-link">
                        {{ decodeFileName(material.title) }}
                      </a>
                      <span class="material-size">{{ formatFileSize(material.file_size) }}</span>
                      <el-button v-if="isOwner" size="small" text type="danger" @click="deleteMaterial(material.id)">
                        Удалить
                      </el-button>
                    </div>
                  </div>
                  <el-empty v-else description="Нет материалов" :image-size="60" />
                </div>

                <!-- Домашние задания -->
                <div v-if="section.type === 'homework'" class="section-content">
                  <div v-if="isOwner" class="add-homework">
                    <el-button size="small" type="primary" @click="openHomeworkDialog(section)">
                      + Создать задание
                    </el-button>
                  </div>

                  <div v-if="section.homeworks?.length" class="homeworks-list">
                    <el-card v-for="homework in section.homeworks" :key="homework.id" class="homework-card">
                      <div class="homework-header">
                        <strong>{{ homework.title }}</strong>
                        <div style="display: flex; gap: 8px; align-items: center;">
                          <el-tag v-if="homework.deadline" size="small" :type="isDeadlinePassed(homework.deadline) ? 'danger' : 'warning'">
                            Дедлайн: {{ formatDate(homework.deadline) }}
                          </el-tag>
                          <el-button 
                            v-if="isOwner" 
                            size="small" 
                            type="danger" 
                            text 
                            @click="deleteHomework(homework.id)"
                          >
                            🗑️
                          </el-button>
                        </div>
                      </div>
                      <p class="homework-desc">{{ homework.description }}</p>
                      
                      <div v-if="!isOwner && isEnrolled" class="homework-submit">
                        <div v-if="getSubmission(homework.id)" class="submission-info">
                          <el-alert 
                            :title="getSubmission(homework.id).is_graded ? `Оценка: ${getSubmission(homework.id).grade}/5` : 'Работа отправлена, ожидает проверки'"
                            :type="getSubmission(homework.id).is_graded ? 'success' : 'info'"
                            show-icon
                          />
                          <el-button size="small" @click="downloadFile(getSubmission(homework.id).file_url)">
                            Скачать мою работу
                          </el-button>
                        </div>
                        <div v-else>
                          <el-upload
                            :action="`http://localhost:3000/courses/homeworks/submit`"
                            :headers="{ Authorization: `Bearer ${token}` }"
                            :data="{ homework_id: homework.id }"
                            :on-success="() => reloadCourse()"
                            :on-error="handleUploadError"
                            :show-file-list="false"
                            :before-upload="(file) => checkDeadline(homework.deadline, file)"
                          >
                            <el-button size="small" type="primary">
                              Сдать работу
                            </el-button>
                          </el-upload>
                        </div>
                      </div>

                      <div v-if="isOwner" class="homework-submissions">
                        <el-button size="small" @click="showSubmissions(homework)">
                          Просмотреть работы ({{ homework.submissions?.length || 0 }})
                        </el-button>
                      </div>
                    </el-card>
                  </div>
                  <el-empty v-else description="Нет домашних заданий" :image-size="60" />
                </div>

                <!-- Тесты -->
                <div v-if="section.type === 'test'" class="section-content">
                  <div v-if="isOwner" class="add-test">
                    <el-button size="default" type="primary" @click="openTestDialog(section)">
                      + Создать тест
                    </el-button>
                  </div>

                  <div v-if="section.tests?.length" class="tests-list">
                    <el-card v-for="test in section.tests" :key="test.id" class="test-card" shadow="hover">
                      <div class="test-content">
                        <div class="test-info">
                          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <h4 class="test-title">{{ test.title }}</h4>
                            <el-button 
                              v-if="isOwner" 
                              type="danger" 
                              size="small" 
                              text 
                              @click="deleteTest(test.id)"
                            >
                              🗑️
                            </el-button>
                          </div>
                          <p class="test-description">{{ test.description || 'Нет описания' }}</p>
                        </div>
                        <div class="test-footer">
                          <div class="test-stats">
                            <el-tag type="info" size="large" effect="plain" style="padding: 8px 16px; font-size: 15px;">
                              📋 {{ test.questions?.length || 0 }} вопросов
                            </el-tag>
                            <el-button 
                              v-if="isOwner" 
                              type="info" 
                              size="default"
                              plain
                              style="padding: 8px 20px; font-size: 14px;"
                              @click="showTestResults(test)"
                            >
                              📊 Результаты
                            </el-button>
                          </div>
                          <div class="test-actions">
                            <el-button 
                              v-if="!isOwner && isEnrolled" 
                              type="primary" 
                              size="default"
                              style="padding: 8px 24px; font-size: 14px;"
                              @click="startTest(test)"
                            >
                              Пройти тест
                            </el-button>
                          </div>
                        </div>
                        <div v-if="!isOwner && isEnrolled && testResult" class="test-result-badge">
                          <el-alert 
                            :title="`Ваш результат: ${testResult.score}/${testResult.max_score} (${Math.round(testResult.score / testResult.max_score * 100)}%)`"
                            :type="testResult.score / testResult.max_score >= 0.7 ? 'success' : 'warning'"
                            show-icon
                            :closable="false"
                          />
                        </div>
                      </div>
                    </el-card>
                  </div>
                  <el-empty v-else description="Нет тестов" :image-size="60" />
                </div>
              </el-collapse-item>
            </el-collapse>
          </div>
        </div>
      </div>
    </el-card>

    <!-- Диалог создания секции -->
    <el-dialog v-model="showAddSectionDialog" title="Новая секция" width="400px">
      <el-form :model="newSection" label-width="100px">
        <el-form-item label="Название">
          <el-input v-model="newSection.title" placeholder="Введите название" />
        </el-form-item>
        <el-form-item label="Тип секции">
          <el-select v-model="newSection.type" style="width: 100%">
            <el-option label="📚 Учебные материалы" value="materials" />
            <el-option label="📝 Домашние задания" value="homework" />
            <el-option label="📋 Тесты" value="test" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddSectionDialog = false">Отмена</el-button>
        <el-button type="primary" @click="createSection" :loading="creatingSection">
          Создать
        </el-button>
      </template>
    </el-dialog>

    <!-- Диалог создания домашнего задания -->
    <el-dialog v-model="showHomeworkDialog" title="Создать домашнее задание" width="500px">
      <el-form :model="newHomework" label-width="100px">
        <el-form-item label="Название" required>
          <el-input v-model="newHomework.title" />
        </el-form-item>
        <el-form-item label="Описание">
          <el-input v-model="newHomework.description" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="Дедлайн">
          <el-date-picker 
            v-model="newHomework.deadline" 
            type="date" 
            placeholder="Выберите дату"
            format="DD.MM.YYYY"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showHomeworkDialog = false">Отмена</el-button>
        <el-button type="primary" @click="createHomework" :loading="creatingHomework">
          Создать
        </el-button>
      </template>
    </el-dialog>

    <!-- Диалог создания теста -->
    <el-dialog v-model="showTestDialog" title="Создать тест" width="600px">
      <el-form :model="newTest" label-width="100px">
        <el-form-item label="Название" required>
          <el-input v-model="newTest.title" />
        </el-form-item>
        <el-form-item label="Описание">
          <el-input v-model="newTest.description" type="textarea" :rows="2" />
        </el-form-item>
        
        <el-divider>Вопросы</el-divider>
        
        <div v-for="(q, idx) in newTest.questions" :key="idx" class="question-item">
          <el-form-item :label="`Вопрос ${idx + 1}`">
            <el-input v-model="q.question_text" placeholder="Текст вопроса" />
          </el-form-item>
          <el-form-item label="Варианты ответов">
            <el-input 
              v-for="(opt, optIdx) in q.options" 
              :key="optIdx"
              v-model="q.options[optIdx]"
              placeholder="Вариант ответа"
              style="margin-bottom: 8px"
            >
              <template #append>
                <el-button text @click="removeOption(idx, optIdx)" :disabled="q.options.length <= 2">
                  ✕
                </el-button>
              </template>
            </el-input>
            <el-button size="small" text @click="addOption(idx)">+ Добавить вариант</el-button>
          </el-form-item>
          <el-form-item label="Правильный ответ">
            <el-select v-model="q.correct_answer" placeholder="Выберите правильный ответ">
              <el-option v-for="opt in q.options" :key="opt" :value="opt" />
            </el-select>
          </el-form-item>
          <el-button size="small" type="danger" text @click="removeQuestion(idx)">Удалить вопрос</el-button>
          <el-divider />
        </div>
        
        <el-button type="primary" text @click="addQuestion">+ Добавить вопрос</el-button>
      </el-form>
      <template #footer>
        <el-button @click="showTestDialog = false">Отмена</el-button>
        <el-button type="primary" @click="createTest" :loading="creatingTest">
          Создать тест
        </el-button>
      </template>
    </el-dialog>

    <!-- Диалог прохождения теста -->
    <el-dialog v-model="showTestPassDialog" :title="currentTest?.title" width="600px">
      <el-form>
        <div v-for="(q, idx) in currentTest?.questions" :key="q.id" class="test-question">
          <p><strong>{{ Number(idx) + 1 }}. {{ q.question_text }}</strong></p>
          <el-radio-group v-model="testAnswers[String(q.id)]">
            <el-radio v-for="opt in q.options" :key="opt" :value="opt">
              {{ opt }}
            </el-radio>
          </el-radio-group>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="showTestPassDialog = false">Отмена</el-button>
        <el-button type="primary" @click="submitTest" :loading="submittingTest">
          Завершить тест
        </el-button>
      </template>
    </el-dialog>

    <!-- Диалог просмотра работ -->
    <el-dialog v-model="showSubmissionsDialog" :title="`Работы: ${currentHomework?.title}`" width="800px">
      <el-table :data="currentHomework?.submissions || []" v-loading="submissionsLoading">
        <el-table-column label="Ученик" min-width="150">
          <template #default="{ row }">
            {{ row.student?.profile?.first_name }} {{ row.student?.profile?.last_name }}
          </template>
        </el-table-column>
        <el-table-column label="Дата сдачи" width="120">
          <template #default="{ row }">
            {{ formatDate(row.submitted_at) }}
          </template>
        </el-table-column>
        <el-table-column label="Файл" width="100">
          <template #default="{ row }">
            <el-button size="small" text @click="downloadFile(row.file_url)">
              Скачать
            </el-button>
          </template>
        </el-table-column>
        <el-table-column label="Оценка" width="100">
          <template #default="{ row }">
            <span v-if="row.is_graded">{{ row.grade }}/5</span>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column label="Действия" width="150">
          <template #default="{ row }">
            <el-button 
              v-if="!row.is_graded"
              size="small" 
              type="primary" 
              @click="openGradeDialog(row)"
            >
              Оценить
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- Диалог оценки -->
    <el-dialog v-model="showGradeDialog" title="Оценить работу" width="400px">
      <el-form>
        <el-form-item label="Оценка">
          <el-rate v-model="gradeValue" :max="5" />
        </el-form-item>
        <el-form-item label="Комментарий">
          <el-input v-model="gradeComment" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showGradeDialog = false">Отмена</el-button>
        <el-button type="primary" @click="submitGrade" :loading="grading">
          Сохранить
        </el-button>
      </template>
    </el-dialog>

    <!-- Диалог результатов тестов -->
    <el-dialog v-model="showTestResultsDialog" :title="`Результаты теста: ${currentTestForResults?.title}`" width="900px">
      <el-table :data="testResults" v-loading="testResultsLoading" stripe>
        <el-table-column label="Ученик" min-width="200">
          <template #default="{ row }">
            <div style="display: flex; align-items: center; gap: 8px;">
              <el-avatar :size="32" :src="row.student?.profile?.avatar_url">
                {{ row.student?.profile?.first_name?.charAt(0) }}
              </el-avatar>
              <span>{{ row.student?.profile?.first_name }} {{ row.student?.profile?.last_name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="Результат" width="150" align="center">
          <template #default="{ row }">
            <el-tag :type="getResultType(row.score, row.max_score)">
              {{ row.score }}/{{ row.max_score }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Процент" width="120" align="center">
          <template #default="{ row }">
            {{ Math.round(row.score / row.max_score * 100) }}%
          </template>
        </el-table-column>
        <el-table-column label="Дата прохождения" width="180">
          <template #default="{ row }">
            {{ formatDate(row.completed_at) }}
          </template>
        </el-table-column>
        <el-table-column label="Действия" width="100">
          <template #default="{ row }">
            <el-button size="small" text @click="viewTestDetails(row)">
              Детали
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- Диалог деталей ответов ученика -->
    <el-dialog v-model="showTestDetailsDialog" :title="`Ответы ученика: ${selectedTestResult?.student?.profile?.first_name} ${selectedTestResult?.student?.profile?.last_name}`" width="700px">
      <el-timeline>
        <el-timeline-item 
          v-for="(question, idx) in testQuestions" 
          :key="question.id"
          :type="isAnswerCorrect(question, selectedTestResult?.answers[question.id]) ? 'success' : 'danger'"
          :hollow="true"
        >
          <div class="test-detail-item">
            <p><strong>Вопрос {{ idx + 1 }}: {{ question.question_text }}</strong></p>
            <p>Правильный ответ: <span style="color: #67c23a;">{{ question.correct_answer }}</span></p>
            <p>Ответ ученика: 
              <span :style="{ color: isAnswerCorrect(question, selectedTestResult?.answers[question.id]) ? '#67c23a' : '#f56c6c' }">
                {{ selectedTestResult?.answers[question.id] || 'Не отвечено' }}
              </span>
            </p>
          </div>
        </el-timeline-item>
      </el-timeline>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCourseStore } from '../../stores/course';
import { useAuthStore } from '../../stores/auth';
import { ArrowLeft, Document } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '../../services/api';

const route = useRoute();
const router = useRouter();
const courseStore = useCourseStore();
const authStore = useAuthStore();

const courseId = computed(() => Number(route.params.id));
const course = computed(() => courseStore.currentCourse);
const loading = computed(() => courseStore.loading);
const isTutor = computed(() => authStore.isTutor);
const isOwner = computed(() => course.value?.tutor_id === authStore.user?.id);
const isEnrolled = computed(() => {
  if (!course.value?.enrollments) return false;
  return course.value.enrollments.some(e => e.student_id === authStore.user?.id);
});

const sortedSections = computed(() => {
  return course.value?.sections?.slice().sort((a, b) => a.order - b.order) || [];
});

const activeSections = ref<number[]>([]);
const token = localStorage.getItem('token');

// Диалоги
const showAddSectionDialog = ref(false);
const creatingSection = ref(false);
const newSection = ref({ title: '', type: 'materials' as 'materials' | 'homework' | 'test' });

const showHomeworkDialog = ref(false);
const creatingHomework = ref(false);
const currentSection = ref<any>(null);
const newHomework = ref({ title: '', description: '', deadline: '' });

const showTestDialog = ref(false);
const creatingTest = ref(false);
const newTest = ref({
  title: '',
  description: '',
  questions: [] as { question_text: string; options: string[]; correct_answer: string }[]
});

const showTestPassDialog = ref(false);
const currentTest = ref<any>(null);
const testAnswers = ref<Record<string, string>>({});
const submittingTest = ref(false);
const testResult = ref<any>(null);

const showSubmissionsDialog = ref(false);
const currentHomework = ref<any>(null);
const submissionsLoading = ref(false);

const showGradeDialog = ref(false);
const currentSubmission = ref<any>(null);
const gradeValue = ref(0);
const gradeComment = ref('');
const grading = ref(false);

// Результаты тестов
const showTestResultsDialog = ref(false);
const showTestDetailsDialog = ref(false);
const currentTestForResults = ref<any>(null);
const testResults = ref<any[]>([]);
const testResultsLoading = ref(false);
const selectedTestResult = ref<any>(null);
const testQuestions = ref<any[]>([]);

// ==================== УТИЛИТЫ ====================

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU');
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getSectionIcon(type: string): string {
  const icons: Record<string, string> = {
    materials: '📚',
    homework: '📝',
    test: '📋'
  };
  return icons[type] || '📄';
}

function getSectionTypeText(type: string): string {
  const texts: Record<string, string> = {
    materials: 'Материалы',
    homework: 'Домашка',
    test: 'Тест'
  };
  return texts[type] || type;
}

function decodeFileName(name: string): string {
  try {
    return decodeURIComponent(escape(name));
  } catch {
    return name;
  }
}

function getSectionTagType(type: string): string {
  const types: Record<string, string> = {
    materials: 'primary',
    homework: 'warning',
    test: 'success'
  };
  return types[type] || 'info';
}

function isDeadlinePassed(deadline: string): boolean {
  return new Date(deadline) < new Date();
}

function getSubmission(homeworkId: number) {
  const homework = course.value?.sections
    ?.flatMap((s: any) => s.homeworks || [])
    .find((h: any) => h.id === homeworkId);
  return homework?.submissions?.find((s: any) => s.student_id === authStore.user?.id);
}

function checkDeadline(deadline: string | undefined, file: any): boolean {
  if (deadline && new Date(deadline) < new Date()) {
    ElMessage.error('Дедлайн сдачи задания истек');
    return false;
  }
  return true;
}

function downloadFile(url: string) {
  window.open(`http://localhost:3000${url}`, '_blank');
}

function handleUploadError(error: any) {
  ElMessage.error(error.response?.data?.message || 'Ошибка загрузки файла');
}

// ==================== КУРС ====================

async function reloadCourse() {
  await courseStore.fetchCourse(courseId.value);
}

async function copyInviteLink() {
  const link = await courseStore.getInviteLink(courseId.value);
  if (link) {
    await navigator.clipboard.writeText(link);
    ElMessage.success('Ссылка скопирована в буфер обмена');
  }
}

async function deleteCourse() {
  try {
    await ElMessageBox.confirm('Вы уверены, что хотите удалить этот курс?', 'Подтверждение', {
      confirmButtonText: 'Да',
      cancelButtonText: 'Нет',
      type: 'warning'
    });
    await courseStore.deleteCourse(courseId.value);
    router.push('/cabinet?tab=courses');
  } catch (error) {
    // отмена
  }
}

// ==================== СЕКЦИИ ====================

async function createSection() {
  if (!newSection.value.title.trim()) {
    ElMessage.warning('Введите название секции');
    return;
  }
  
  creatingSection.value = true;
  await courseStore.createSection(courseId.value, {
    title: newSection.value.title,
    type: newSection.value.type
  });
  creatingSection.value = false;
  showAddSectionDialog.value = false;
  newSection.value = { title: '', type: 'materials' };
  await reloadCourse();
}

async function deleteSection(sectionId: number) {
  try {
    await ElMessageBox.confirm('Удалить эту секцию?', 'Подтверждение', {
      confirmButtonText: 'Да',
      cancelButtonText: 'Нет',
      type: 'warning'
    });
    await courseStore.deleteSection(sectionId, courseId.value);
    await reloadCourse();
  } catch (error) {
    // отмена
  }
}

// ==================== МАТЕРИАЛЫ ====================

async function deleteMaterial(materialId: number) {
  try {
    await ElMessageBox.confirm('Удалить этот материал?', 'Подтверждение', {
      confirmButtonText: 'Да',
      cancelButtonText: 'Нет',
      type: 'warning'
    });
    await api.delete(`/courses/materials/${materialId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    await reloadCourse();
    ElMessage.success('Материал удален');
  } catch (error) {
    // отмена
  }
}

// ==================== ДОМАШНИЕ ЗАДАНИЯ ====================

function openHomeworkDialog(section: any) {
  currentSection.value = section;
  newHomework.value = { title: '', description: '', deadline: '' };
  showHomeworkDialog.value = true;
}

async function createHomework() {
  if (!newHomework.value.title.trim()) {
    ElMessage.warning('Введите название задания');
    return;
  }
  
  creatingHomework.value = true;
  try {
    await api.post(`/courses/sections/${currentSection.value.id}/homeworks`, newHomework.value, {
      headers: { Authorization: `Bearer ${token}` }
    });
    await reloadCourse();
    showHomeworkDialog.value = false;
    ElMessage.success('Домашнее задание создано');
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || 'Ошибка создания');
  } finally {
    creatingHomework.value = false;
  }
}

async function deleteHomework(homeworkId: number) {
  try {
    await ElMessageBox.confirm('Удалить это домашнее задание?', 'Подтверждение', {
      confirmButtonText: 'Да',
      cancelButtonText: 'Нет',
      type: 'warning',
    });
    
    await api.delete(`/courses/homeworks/${homeworkId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    await reloadCourse();
    ElMessage.success('Домашнее задание удалено');
  } catch (error) {
    // отмена
  }
}

async function showSubmissions(homework: any) {
  currentHomework.value = homework;
  showSubmissionsDialog.value = true;
  submissionsLoading.value = true;
  try {
    const response = await api.get(`/courses/homeworks/${homework.id}/submissions`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    currentHomework.value.submissions = response.data;
  } catch (error) {
    ElMessage.error('Ошибка загрузки работ');
  } finally {
    submissionsLoading.value = false;
  }
}

function openGradeDialog(submission: any) {
  currentSubmission.value = submission;
  gradeValue.value = submission.grade || 0;
  gradeComment.value = submission.comment || '';
  showGradeDialog.value = true;
}

async function submitGrade() {
  if (gradeValue.value < 1 || gradeValue.value > 5) {
    ElMessage.warning('Оценка должна быть от 1 до 5');
    return;
  }
  
  grading.value = true;
  try {
    await api.post(`/courses/submissions/${currentSubmission.value.id}/grade`, {
      grade: gradeValue.value,
      comment: gradeComment.value
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    await showSubmissions(currentHomework.value);
    showGradeDialog.value = false;
    ElMessage.success('Оценка сохранена');
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || 'Ошибка сохранения');
  } finally {
    grading.value = false;
  }
}

// ==================== ТЕСТЫ ====================

function openTestDialog(section: any) {
  currentSection.value = section;
  newTest.value = {
    title: '',
    description: '',
    questions: [{ question_text: '', options: ['', ''], correct_answer: '' }]
  };
  showTestDialog.value = true;
}

function addQuestion() {
  newTest.value.questions.push({
    question_text: '',
    options: ['', ''],
    correct_answer: ''
  });
}

function removeQuestion(idx: number) {
  newTest.value.questions.splice(idx, 1);
}

function addOption(questionIdx: number) {
  const question = newTest.value.questions[questionIdx];
  if (question) {
    question.options.push('');
  }
}

function removeOption(questionIdx: number, optionIdx: number) {
  const question = newTest.value.questions[questionIdx];
  if (question) {
    question.options.splice(optionIdx, 1);
  }
}

async function createTest() {
  if (!newTest.value.title.trim()) {
    ElMessage.warning('Введите название теста');
    return;
  }
  
  for (const q of newTest.value.questions) {
    if (!q.question_text.trim()) {
      ElMessage.warning('Заполните все вопросы');
      return;
    }
    if (q.options.some((opt: string) => !opt.trim())) {
      ElMessage.warning('Заполните все варианты ответов');
      return;
    }
    if (!q.correct_answer) {
      ElMessage.warning('Выберите правильный ответ для каждого вопроса');
      return;
    }
  }
  
  creatingTest.value = true;
  try {
    await api.post(`/courses/sections/${currentSection.value.id}/tests`, newTest.value, {
      headers: { Authorization: `Bearer ${token}` }
    });
    await reloadCourse();
    showTestDialog.value = false;
    ElMessage.success('Тест создан');
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || 'Ошибка создания');
  } finally {
    creatingTest.value = false;
  }
}

async function deleteTest(testId: number) {
  try {
    await ElMessageBox.confirm('Удалить этот тест? Все результаты и вопросы будут потеряны!', 'Подтверждение', {
      confirmButtonText: 'Да',
      cancelButtonText: 'Нет',
      type: 'warning',
    });
    
    console.log('Удаляем тест с id:', testId);
    
    const response = await api.delete(`/courses/tests/${testId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Ответ сервера:', response);
    
    await reloadCourse();
    ElMessage.success('Тест удален');
  } catch (error: any) {
    console.error('Ошибка удаления:', error);
    ElMessage.error(error.response?.data?.message || 'Ошибка удаления теста');
  }
}

async function startTest(test: any) {
  currentTest.value = test;
  testAnswers.value = {};
  testResult.value = null;
  
  try {
    const response = await api.get(`/courses/tests/${test.id}/my-result`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (response.data) {
      testResult.value = response.data;
      ElMessage.info('Вы уже проходили этот тест');
      return;
    }
  } catch (error) {
    // не проходил
  }
  
  showTestPassDialog.value = true;
}

async function submitTest() {
  const answers: Record<string, string> = {};
  for (const q of currentTest.value.questions) {
    const answer = testAnswers.value[String(q.id)];
    if (!answer) {
      ElMessage.warning('Ответьте на все вопросы');
      return;
    }
    answers[String(q.id)] = answer;
  }
  
  submittingTest.value = true;
  try {
    const response = await api.post('/courses/tests/submit', {
      test_id: currentTest.value.id,
      answers
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    testResult.value = response.data;
    showTestPassDialog.value = false;
    ElMessage.success(`Ваш результат: ${response.data.score}/${response.data.max_score}`);
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || 'Ошибка отправки теста');
  } finally {
    submittingTest.value = false;
  }
}

// ==================== РЕЗУЛЬТАТЫ ТЕСТОВ ====================

function getResultType(score: number, maxScore: number): string {
  const percent = score / maxScore * 100;
  if (percent >= 70) return 'success';
  if (percent >= 50) return 'warning';
  return 'danger';
}

function isAnswerCorrect(question: any, answer: string): boolean {
  return answer === question.correct_answer;
}

async function showTestResults(test: any) {
  currentTestForResults.value = test;
  showTestResultsDialog.value = true;
  testResultsLoading.value = true;
  
  try {
    const response = await api.get(`/courses/tests/${test.id}/results`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    testResults.value = response.data;
  } catch (error) {
    ElMessage.error('Ошибка загрузки результатов');
  } finally {
    testResultsLoading.value = false;
  }
}

async function viewTestDetails(result: any) {
  selectedTestResult.value = result;
  testQuestions.value = currentTestForResults.value.questions || [];
  showTestDetailsDialog.value = true;
}

// ==================== ЖИЗНЕННЫЙ ЦИКЛ ====================

onMounted(async () => {
  await courseStore.fetchCourse(courseId.value);
  if (course.value?.sections) {
    activeSections.value = course.value.sections.map(s => s.id);
  }
});
</script>

<style scoped>
.course-detail {
  max-width: 1000px;
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
}

.course-description {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #eee;
}

.course-meta {
  display: flex;
  gap: 20px;
  margin-top: 15px;
  color: #909399;
  font-size: 13px;
}

.sections-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.section-actions {
  margin-left: auto;
}

.section-content {
  padding: 15px 0;
}

.add-material, .add-homework, .add-test {
  margin-bottom: 20px;
}

.materials-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.material-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 8px;
}

.material-link {
  flex: 1;
  color: #409eff;
  text-decoration: none;
  cursor: pointer;
}

.material-link:hover {
  text-decoration: underline;
}

.material-size {
  font-size: 12px;
  color: #909399;
}

.homeworks-list, .tests-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.homework-card {
  background: #fafafa;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.homework-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.homework-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  flex-wrap: wrap;
  gap: 8px;
}

.homework-desc {
  color: #666;
  margin: 10px 0;
  line-height: 1.5;
}

.homework-submit, .test-result {
  margin-top: 15px;
}

/* Новые стили для тестов */
.test-card {
  margin-bottom: 20px;
  border-radius: 16px;
  transition: all 0.3s ease;
  background: linear-gradient(135deg, #fff 0%, #f8f9fa 100%);
  border: 1px solid #ebeef5;
  overflow: hidden;
}

.test-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border-color: #d0d7de;
}

.test-content {
  padding: 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.test-info {
  flex: 1;
}

.test-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: #2c3e50;
}

.test-description {
  font-size: 15px;
  color: #606266;
  margin: 0;
  line-height: 1.6;
}

.test-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

.test-stats {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.test-actions {
  display: flex;
  gap: 8px;
}

.test-stats :deep(.el-tag) {
  font-weight: 500;
  border-radius: 20px;
}

.test-actions :deep(.el-button) {
  border-radius: 20px;
  font-weight: 500;
}

.test-result-badge {
  margin-top: 8px;
}

.test-result-badge :deep(.el-alert) {
  border-radius: 8px;
  padding: 8px 12px;
  background-color: #f0f9eb;
}

.question-item {
  margin-bottom: 20px;
  padding: 15px;
  background: #f9f9f9;
  border-radius: 8px;
}

.test-question {
  margin-bottom: 25px;
  padding: 15px;
  background: #f9f9f9;
  border-radius: 8px;
}

.test-question p {
  margin-bottom: 10px;
}

.test-detail-item {
  padding: 10px;
}

.test-detail-item p {
  margin: 8px 0;
}

.empty-sections {
  padding: 40px;
  text-align: center;
}
</style>