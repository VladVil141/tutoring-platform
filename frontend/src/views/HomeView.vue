<template>
  <div>
    <!-- Hero секция -->
    <el-card style="margin-bottom: 40px; padding: 40px; text-align: center;">
      <h1 style="font-size: 42px; margin-bottom: 20px; color: #1f2a37;">
        Добро пожаловать на платформу для репетиторов!
      </h1>
      <p style="font-size: 18px; color: #4b5565; margin-bottom: 30px;">
        Более 1000 проверенных преподавателей по всем предметам
      </p>
      
      <div style="margin-top: 30px;">
        <template v-if="!authStore.isAuthenticated">
          <el-button type="primary" size="large" style="margin: 0 10px;" @click="$router.push('/register')">
            Начать обучение
          </el-button>
          <el-button size="large" style="margin: 0 10px;" @click="$router.push('/login')">
            Войти
          </el-button>
        </template>
        <template v-else>
          <el-button type="primary" size="large" @click="$router.push('/cabinet')">
            Личный кабинет
          </el-button>
        </template>
      </div>

      <el-row :gutter="40" style="margin-top: 50px;">
        <el-col :span="8" v-for="stat in stats" :key="stat.label">
          <div style="text-align: center;">
            <div style="font-size: 32px; font-weight: 700; color: #1f2a37;">{{ stat.number }}</div>
            <div style="font-size: 14px; color: #6b7280;">{{ stat.label }}</div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- Преимущества -->
    <h2 style="text-align: center; font-size: 32px; margin-bottom: 40px; color: #1f2a37;">
      Почему выбирают нас
    </h2>
    
    <el-row :gutter="20">
      <el-col :span="8" v-for="feature in features" :key="feature.title">
        <el-card style="height: 200px; text-align: center; display: flex; flex-direction: column; justify-content: center;">
          <h3 style="margin-bottom: 12px; color: #1f2a37;">{{ feature.title }}</h3>
          <p style="color: #6b7280;">{{ feature.description }}</p>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

const stats = [
  { number: '1000+', label: 'Репетиторов' },
  { number: '50+', label: 'Предметов' },
  { number: '5000+', label: 'Учеников' }
]

const features = [
  { title: 'Опытные репетиторы', description: 'Все преподаватели проходят строгий отбор' },
  { title: 'Все предметы', description: 'От школьной математики до программирования' },
  { title: 'Удобное расписание', description: 'Занимайтесь в любое удобное время' }
]
</script>