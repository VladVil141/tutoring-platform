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
          <el-input 
            v-model="form.subject" 
            placeholder="Например: Математика, Физика, Английский язык"
          />
        </el-form-item>

        <el-form-item label="Стоимость (₽/час)" prop="price">
          <el-input-number 
            v-model="form.price" 
            :min="0" 
            :max="10000"
            style="width: 100%;"
          />
        </el-form-item>

        <el-form-item label="Описание" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="4"
            placeholder="Подробное описание занятий, методика, подготовка к экзаменам и т.д."
          />
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

        <!-- Блок для групповых занятий -->
        <template v-if="form.type === 'group'">
          <el-divider>Настройки группы</el-divider>

          <el-form-item label="Дни недели" prop="weekdays">
            <el-checkbox-group v-model="form.weekdays">
              <el-checkbox label="ПН">ПН</el-checkbox>
              <el-checkbox label="ВТ">ВТ</el-checkbox>
              <el-checkbox label="СР">СР</el-checkbox>
              <el-checkbox label="ЧТ">ЧТ</el-checkbox>
              <el-checkbox label="ПТ">ПТ</el-checkbox>
              <el-checkbox label="СБ">СБ</el-checkbox>
              <el-checkbox label="ВС">ВС</el-checkbox>
            </el-checkbox-group>
          </el-form-item>

          <el-form-item label="Время" prop="time">
            <el-time-select
              v-model="form.time"
              start="08:00"
              step="01:00"
              end="22:00"
              placeholder="Выберите время"
              style="width: 100%;"
            />
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

          <el-form-item label="Длительность курса (недель)" prop="weeks">
            <el-input-number 
              v-model="form.weeks" 
              :min="1" 
              :max="52" 
              style="width: 100%;"
            />
            <div class="form-tip" style="font-size: 12px; color: #909399; margin-top: 5px;">
              На основе этого будет сгенерировано расписание занятий
            </div>
          </el-form-item>
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

// Формируем строку расписания для отправки на бэкенд
const scheduleString = computed(() => {
  if (form.type !== 'group' || form.weekdays.length === 0 || !form.time) return '';
  return `${form.weekdays.join('/')} ${form.time}`;
});

const form = reactive({
  type: 'individual',
  subject: '',
  price: 500,
  description: '',
  level: 'any',
  format: 'any',
  // Групповые поля
  weekdays: [] as string[],
  time: '',
  min_students: 2,
  max_students: 8,
  weeks: 4
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
  weekdays: [
    { required: true, message: 'Выберите дни недели', trigger: 'change' }
  ],
  time: [
    { required: true, message: 'Выберите время', trigger: 'change' }
  ],
  min_students: [
    { required: true, message: 'Укажите минимум учеников', trigger: 'blur' },
    { type: 'number', min: 1, message: 'Минимум 1 ученик', trigger: 'blur' }
  ],
  max_students: [
    { required: true, message: 'Укажите максимум учеников', trigger: 'blur' },
    { type: 'number', min: 1, max: 50, message: 'Максимум 50 учеников', trigger: 'blur' }
  ],
  weeks: [
    { required: true, message: 'Укажите длительность курса', trigger: 'blur' },
    { type: 'number', min: 1, max: 52, message: 'От 1 до 52 недель', trigger: 'blur' }
  ]
});

onMounted(async () => {
  if (!authStore.isAuthenticated || !authStore.isTutor) {
    router.push('/');
    return;
  }

  // Устанавливаем тип формы по URL
  if (isGroup.value) {
    form.type = 'group';
  }

  // Если это редактирование
  if (isEdit.value) {
    const id = Number(route.params.id);
    
    if (isGroup.value) {
      const listing = await groupListingStore.fetchListing(id);
      if (listing) {
        form.subject = listing.subject;
        form.price = Number(listing.price);
        form.description = listing.description;
        form.level = listing.level;
        form.format = listing.format;
        
        // Парсим расписание
        if (listing.schedule) {
          const [days, time] = listing.schedule.split(' ');
          form.weekdays = days.split('/');
          form.time = time;
        }
        
        form.min_students = listing.min_students;
        form.max_students = listing.max_students;
        form.weeks = listing.weeks || 4;
      }
    } else {
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
        const dataToSend: any = {
          subject: form.subject,
          price: form.price,
          description: form.description,
          level: form.level,
          format: form.format,
        };
        
        if (form.type === 'group') {
          dataToSend.schedule = scheduleString.value;
          dataToSend.min_students = form.min_students;
          dataToSend.max_students = form.max_students;
          dataToSend.weeks = form.weeks;
        }
        
        if (isEdit.value) {
          if (form.type === 'individual') {
            await listingStore.updateListing(Number(route.params.id), dataToSend);
          } else {
            await groupListingStore.updateListing(Number(route.params.id), dataToSend);
          }
        } else {
          if (form.type === 'individual') {
            await listingStore.createListing(dataToSend);
          } else {
            await groupListingStore.createListing(dataToSend);
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

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

:deep(.el-checkbox-group) {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

:deep(.el-checkbox) {
  margin-right: 0;
}
</style>