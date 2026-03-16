<template>
  <div style="display: flex; justify-content: center; align-items: center; min-height: 70vh;">
    <el-card style="width: 400px;">
      <template #header>
        <h2 style="text-align: center;">Вход</h2>
      </template>
      
      <el-form :model="form" label-width="80px">
        <el-form-item label="Email">
          <el-input v-model="form.email" placeholder="example@mail.com" />
        </el-form-item>
        
        <el-form-item label="Пароль">
          <el-input v-model="form.password" type="password" show-password placeholder="••••••" />
        </el-form-item>
        
        <el-form-item>
          <el-button 
            type="primary" 
            @click="handleLogin" 
            :loading="loading" 
            style="width: 100%; background-color: #2c3e50; border-color: #2c3e50;"
            @mouseenter="$event.target.style.backgroundColor = '#34495e'"
            @mouseleave="$event.target.style.backgroundColor = '#2c3e50'"
          >
            Войти
          </el-button>
        </el-form-item>
        
        <div style="text-align: center; margin-top: 10px;">
          <el-button type="text" @click="$router.push('/register')" style="color: #2c3e50;">
            Нет аккаунта? Зарегистрироваться
          </el-button>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { ElMessage } from 'element-plus'

const router = useRouter()
const authStore = useAuthStore()
const loading = ref(false)

const form = ref({
  email: '',
  password: ''
})

const handleLogin = async () => {
  if (!form.value.email || !form.value.password) {
    ElMessage.warning('Заполните все поля')
    return
  }
  
  loading.value = true
  const success = await authStore.login(form.value)
  loading.value = false
  
  if (success) {
    router.push('/')
  }
}
</script>

<style scoped>
:deep(.el-button--text) {
  color: #2c3e50 !important;
}

:deep(.el-button--text:hover) {
  color: #34495e !important;
}
</style>