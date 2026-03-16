<template>
  <div style="max-width: 800px; margin: 0 auto;">
    <el-card v-if="profile" :loading="loading">
      <template #header>
        <div style="display: flex; align-items: center; gap: 20px;">
          <el-avatar :size="80" :src="profile.avatar_url" style="background: #409EFF;">
            {{ profile.first_name?.charAt(0) }}{{ profile.last_name?.charAt(0) }}
          </el-avatar>
          <div>
            <h2>{{ profile.first_name }} {{ profile.last_name }}</h2>
            <el-tag :type="profile.role === 'tutor' ? 'success' : 'info'" size="small">
              {{ profile.role === 'tutor' ? 'Репетитор' : 'Ученик' }}
            </el-tag>
          </div>
        </div>
      </template>

      <el-descriptions :column="1" border>
        <el-descriptions-item label="Город">{{ profile.city || 'Не указан' }}</el-descriptions-item>
        <el-descriptions-item label="О себе">{{ profile.bio || 'Нет информации' }}</el-descriptions-item>
        
        <template v-if="profile.role === 'tutor'">
          <el-descriptions-item label="Образование">{{ profile.education || 'Не указано' }}</el-descriptions-item>
          <el-descriptions-item label="Опыт">{{ profile.experience || 'Не указан' }}</el-descriptions-item>
          <el-descriptions-item label="Предметы">{{ profile.subjects || 'Не указаны' }}</el-descriptions-item>
          <el-descriptions-item label="Стоимость">{{ profile.hourly_rate ? profile.hourly_rate + ' ₽/час' : 'Не указана' }}</el-descriptions-item>
          <el-descriptions-item label="Статус">
            <el-tag :type="profile.is_verified ? 'success' : 'info'" size="small">
              {{ profile.is_verified ? 'Проверен' : 'Не проверен' }}
            </el-tag>
          </el-descriptions-item>
        </template>
      </el-descriptions>

      <div v-if="!profile.is_public" style="margin-top: 20px;">
        <el-alert type="warning" :closable="false">
          Этот профиль скрыт владельцем
        </el-alert>
      </div>

      <div v-if="authStore.isAuthenticated && authStore.user?.id !== Number(route.params.id)" 
           style="margin-top: 20px; text-align: center;">
        <el-button type="primary" @click="contactTutor" v-if="profile.role === 'tutor'">
          Связаться с репетитором
        </el-button>
      </div>
    </el-card>

    <div v-else-if="!loading" style="text-align: center; padding: 50px;">
      <el-empty description="Профиль не найден" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { userService } from '../services/api'
import { useAuthStore } from '../stores/auth'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const profile = ref<any>(null)
const loading = ref(false)

onMounted(async () => {
  await loadProfile()
})

async function loadProfile() {
  const id = route.params.id
  if (!id) return
  
  loading.value = true
  try {
    const response = await userService.getPublicProfile(Number(id))
    profile.value = response.data
  } catch (error: any) {
    if (error.response?.status === 404) {
      ElMessage.error('Профиль не найден')
    } else {
      ElMessage.error('Ошибка загрузки профиля')
    }
  } finally {
    loading.value = false
  }
}

function contactTutor() {
  if (!authStore.isAuthenticated) {
    router.push('/login')
    ElMessage.info('Войдите, чтобы связаться с репетитором')
  } else {
    ElMessage.info('Функция будет доступна в Этапе 2')
    // TODO: Переход к созданию заявки
  }
}
</script>