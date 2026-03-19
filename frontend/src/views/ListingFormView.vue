<template>
  <div class="listing-form-container">
    <el-card class="listing-form-card">
      <template #header>
        <h2>{{ isEdit ? 'Редактировать объявление' : 'Создать объявление' }}</h2>
      </template>

      <el-form :model="form" :rules="rules" ref="formRef" label-width="140px">
        
        <!-- Переключатель типа занятия -->
        <el-form-item label="Тип занятия" prop="type">
          <el-radio-group v-model="form.type">
            <el-radio value="individual">Индивидуальное</el-radio>
            <el-radio value="group">Групповое</el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- Общие поля -->
        <el-form-item label="Предмет" prop="subject">
          <el-input v-model="form.subject" placeholder="Например: Математика, Физика, Английский язык" />
        </el-form-item>

        <el-form-item label="Стоимость (₽/час)" prop="price">
          <el-input-number v-model="form.price" :min="0" :max="10000" style="width: 100%;" />
        </el-form-item>

        <el-form-item label="Описание" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="4" 
            placeholder="Подробное описание занятий, методика, подготовка к экзаменам и т.д." />
        </el-form-item>

        <el-form-item label="Уровень" prop="level">
          <el-select v-model="form.level" placeholder="Выберите уровень" style="width: 100%;">
            <el-option label="Школьный" value="school" />
            <el-option label="Университетский" value="university" />
            <el-option label="Любой" value="any" />
          </el-select>
        </el-form-item>

        <el-form-item label="Формат" prop="format">
          <el-select v-model="form.format" placeholder="Выберите формат" style="width: 100%;">
            <el-option label="Онлайн" value="online" />
            <el-option label="Офлайн" value="offline" />
            <el-option label="Любой" value="any" />
          </el-select>
        </el-form-item>

        <!-- Поля для групповых занятий -->
        <template v-if="form.type === 'group'">
          <el-divider>Настройки группы</el-divider>

          <el-form-item label="Расписание" prop="schedule">
            <el-input v-model="form.schedule" placeholder="Например: Пн/Ср 19:00 или Вт/Чт 17:00" />
          </el-form-item>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="Мин. учеников" prop="min_students">
                <el-input-number v-model="form.min_students" :min="1" :max="20" style="width: 100%;" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="Макс. учеников" prop="max_students">
                <el-input-number v-model="form.max_students" :min="1" :max="50" style="width: 100%;" />
              </el-form-item>
            </el-col>
          </el-row>
        </template>

        <el-form-item>
          <el-button type="primary" @click="saveListing" :loading="loading">
            {{ isEdit ? 'Сохранить' : 'Создать' }}
          </el-button>
          <el-button @click="goBack">Отмена</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useListingStore } from '../stores/listing';
import { useGroupListingStore } from '../stores/groupListing';
import { useAuthStore } from '../stores/auth';
import type { FormInstance, FormRules } from 'element-plus';

const router = useRouter();
const route = useRoute();
const listingStore = useListingStore();
const groupListingStore = useGroupListingStore();
const authStore = useAuthStore();
const formRef = ref<FormInstance>();
const loading = ref(false);

const isEdit = computed(() => !!route.params.id);
const isGroup = computed(() => route.path.includes('/group-listings'));

const form = reactive({
  type: 'individual',
  subject: '',
  price: 500,
  description: '',
  level: 'any',
  format: 'any',
  // Групповые поля
  schedule: '',
  min_students: 2,
  max_students: 50
});

const rules = reactive<FormRules>({
  subject: [
    { required: true, message: 'Введите предмет', trigger: 'blur' },
    { min: 2, message: 'Минимум 2 символа', trigger: 'blur' }
  ],
  price: [
    { required: true, message: 'Укажите стоимость', trigger: 'blur' }
  ],
  description: [
    { required: true, message: 'Введите описание', trigger: 'blur' },
    { min: 10, message: 'Минимум 10 символов', trigger: 'blur' }
  ],
  schedule: [
    { required: true, message: 'Укажите расписание группы', trigger: 'blur' }
  ],
  min_students: [
    { required: true, message: 'Укажите минимум учеников', trigger: 'blur' },
    { type: 'number', min: 1, message: 'Минимум 1 ученик', trigger: 'blur' }
  ],
  max_students: [
    { required: true, message: 'Укажите максимум учеников', trigger: 'blur' },
    { type: 'number', min: 1, max: 50, message: 'Максимум 50 учеников', trigger: 'blur' }
  ]
});

onMounted(async () => {
  if (!authStore.isAuthenticated || !authStore.isTutor) {
    router.push('/');
    return;
  }

  // Определяем тип по URL
  const isGroup = route.path.includes('/group-listings');
  
  // Устанавливаем тип формы
  if (isGroup) {
    form.type = 'group';
  } else {
    form.type = 'individual';
  }

  // Если это редактирование
  if (isEdit.value) {
    const id = Number(route.params.id);
    
    if (isGroup) {
      // Загружаем групповое объявление
      const listing = await groupListingStore.fetchListing(id);
      if (listing) {
        form.subject = listing.subject;
        form.price = Number(listing.price);
        form.description = listing.description;
        form.level = listing.level;
        form.format = listing.format;
        form.schedule = listing.schedule;
        form.min_students = listing.min_students;
        form.max_students = listing.max_students;
      }
    } else {
      // Загружаем индивидуальное объявление
      const listing = await listingStore.fetchListing(id);
      if (listing) {
        form.subject = listing.subject;
        form.price = Number(listing.price);
        form.description = listing.description;
        form.level = listing.level;
        form.format = listing.format;
      }
    }
  }
});

async function saveListing() {
  if (!formRef.value) return;

  await formRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true;
      
      try {
        if (form.type === 'individual') {
          if (isEdit.value) {
            await listingStore.updateListing(Number(route.params.id), form);
          } else {
            await listingStore.createListing(form);
          }
        } else {
          if (isEdit.value) {
            await groupListingStore.updateListing(Number(route.params.id), form);
          } else {
            await groupListingStore.createListing(form);
          }
        }
        
        router.push('/cabinet?tab=listings');
      } catch (error) {
        console.error('Ошибка сохранения:', error);
      } finally {
        loading.value = false;
      }
    }
  });
}

function goBack() {
  router.push('/cabinet?tab=listings');
}
</script>

<style scoped>
.listing-form-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 70vh;
}

.listing-form-card {
  width: 600px;
}
</style>