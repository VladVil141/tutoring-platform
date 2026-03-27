<template>
  <div class="join-course">
    <el-card class="join-card">
      <div v-if="loading" class="loading">
        <el-skeleton :rows="3" animated />
      </div>
      
      <div v-else-if="joined" class="success">
        <div style="text-align: center;">
          <el-icon :size="48" color="#67c23a"><CircleCheck /></el-icon>
          <h2>Вы успешно записаны на курс!</h2>
          <p v-if="courseTitle" style="margin: 16px 0;">Вы записаны на курс "{{ courseTitle }}"</p>
          <el-button type="primary" @click="goToCourse" style="margin-top: 20px;">
            Перейти к курсу
          </el-button>
        </div>
      </div>
      
      <div v-else-if="alreadyEnrolled" class="already-enrolled">
        <div style="text-align: center;">
          <el-icon :size="48" color="#e6a23c"><Warning /></el-icon>
          <h2>Вы уже записаны на этот курс</h2>
          <p v-if="courseTitle" style="margin: 16px 0;">Вы уже записаны на курс "{{ courseTitle }}"</p>
          <el-button type="primary" @click="goToCourse" style="margin-top: 20px;">
            Перейти к курсу
          </el-button>
        </div>
      </div>
      
      <div v-else-if="error" class="error">
        <div style="text-align: center;">
          <el-icon :size="48" color="#f56c6c"><CircleClose /></el-icon>
          <h2>Ошибка</h2>
          <p style="margin: 16px 0;">{{ errorMessage }}</p>
          <el-button @click="$router.push('/catalog')" style="margin-top: 20px;">
            Вернуться в каталог
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCourseStore } from '../../stores/course';
import { CircleCheck, CircleClose, Warning } from '@element-plus/icons-vue';

const route = useRoute();
const router = useRouter();
const courseStore = useCourseStore();

const loading = ref(true);
const joined = ref(false);
const alreadyEnrolled = ref(false);
const error = ref(false);
const errorMessage = ref('');
const courseId = ref<number | null>(null);
const courseTitle = ref('');

onMounted(async () => {
  const token = route.params.token as string;
  
  if (!token) {
    error.value = true;
    errorMessage.value = 'Неверная ссылка';
    loading.value = false;
    return;
  }
  
  try {
    const result = await courseStore.joinCourse(token);
    console.log('Join result:', result);
    
    if (result && result.success === false) {
      // Уже записан
      alreadyEnrolled.value = true;
      courseId.value = result.course?.id || null;
      courseTitle.value = result.course?.title || '';
    } else if (result && result.id) {
      // Успешно записан
      joined.value = true;
      courseId.value = result.id;
      courseTitle.value = result.title;
    } else if (result && result.course) {
      // Успешно записан (альтернативный формат)
      joined.value = true;
      courseId.value = result.course.id;
      courseTitle.value = result.course.title;
    } else {
      error.value = true;
      errorMessage.value = 'Не удалось записаться на курс. Попробуйте позже.';
    }
  } catch (err: any) {
    console.error('Join error:', err);
    
    // Проверяем, не ошибка ли "уже записан"
    if (err.response?.data?.message?.includes('уже записаны')) {
      alreadyEnrolled.value = true;
      courseId.value = err.response?.data?.courseId || null;
      courseTitle.value = err.response?.data?.courseTitle || '';
    } else {
      error.value = true;
      errorMessage.value = err.response?.data?.message || 'Не удалось записаться на курс. Возможно, ссылка недействительна.';
    }
  } finally {
    loading.value = false;
  }
});

function goToCourse() {
  if (courseId.value) {
    router.push(`/courses/${courseId.value}`);
  } else {
    router.push('/cabinet?tab=courses');
  }
}
</script>

<style scoped>
.join-course {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  padding: 40px;
}

.join-card {
  max-width: 500px;
  width: 100%;
}

.loading, .success, .already-enrolled, .error {
  padding: 40px;
  text-align: center;
}

.success h2, .already-enrolled h2, .error h2 {
  margin: 16px 0 0;
  font-size: 20px;
}

.success p, .already-enrolled p, .error p {
  color: #666;
}
</style>