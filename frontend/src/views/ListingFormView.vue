<template>
  <div class="listing-form-container">
    <el-card class="listing-form-card">
      <template #header>
        <h2>{{ isEdit ? 'Редактировать объявление' : 'Создать объявление' }}</h2>
      </template>

      <el-form :model="form" :rules="rules" ref="formRef" label-width="140px">
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

        <el-form-item>
          <el-button type="primary" @click="saveListing" :loading="listingStore.loading">
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
import { useAuthStore } from '../stores/auth';
import type { FormInstance, FormRules } from 'element-plus';

const router = useRouter();
const route = useRoute();
const listingStore = useListingStore();
const authStore = useAuthStore();
const formRef = ref<FormInstance>();

const isEdit = computed(() => !!route.params.id);

const form = reactive({
  subject: '',
  price: 500,
  description: '',
  level: 'any',
  format: 'any'
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
  ]
});

onMounted(async () => {
  if (!authStore.isAuthenticated || !authStore.isTutor) {
    router.push('/');
    return;
  }

  if (isEdit.value) {
    const id = Number(route.params.id);
    const listing = await listingStore.fetchListing(id);
    if (listing) {
      form.subject = listing.subject;
      form.price = Number(listing.price);
      form.description = listing.description;
      form.level = listing.level;
      form.format = listing.format;
    }
  }
});

async function saveListing() {
  if (!formRef.value) return;

  await formRef.value.validate(async (valid) => {
    if (valid) {
      if (isEdit.value) {
        await listingStore.updateListing(Number(route.params.id), form);
      } else {
        await listingStore.createListing(form);
      }
      goBack();
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