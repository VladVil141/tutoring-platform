<template>
  <div style="display: flex; justify-content: center; align-items: center; min-height: 70vh;">
    <el-card style="width: 500px;">
      <template #header>
        <h2 style="text-align: center;">Регистрация</h2>
      </template>
      
      <el-form :model="form" label-width="100px">
        <el-form-item label="Email">
          <el-input v-model="form.email" placeholder="example@mail.com" />
        </el-form-item>
        
        <el-form-item label="Пароль">
          <el-input v-model="form.password" type="password" show-password placeholder="минимум 6 символов" />
        </el-form-item>
        
        <el-form-item label="Имя">
          <el-input v-model="form.first_name" placeholder="Иван" />
        </el-form-item>
        
        <el-form-item label="Фамилия">
          <el-input v-model="form.last_name" placeholder="Петров" />
        </el-form-item>
        
        <el-form-item label="Телефон">
          <el-input v-model="form.phone" placeholder="+7 (999) 123-45-67 (необязательно)" />
        </el-form-item>
        
        <el-form-item label="Роль">
          <el-radio-group v-model="form.role">
            <el-radio value="student">Ученик</el-radio>
            <el-radio value="tutor">Репетитор</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item>
          <el-button 
            type="primary" 
            @click="handleRegister" 
            :loading="loading" 
            style="width: 100%; background-color: #2c3e50; border-color: #2c3e50;"
            @mouseenter="$event.target.style.backgroundColor = '#34495e'"
            @mouseleave="$event.target.style.backgroundColor = '#2c3e50'"
          >
            Зарегистрироваться
          </el-button>
        </el-form-item>
        
        <div style="text-align: center; margin-top: 10px;">
          <el-button type="text" @click="$router.push('/login')" style="color: #2c3e50;">
            Уже есть аккаунт? Войти
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

interface RegisterForm {
  email: string
  password: string
  first_name: string
  last_name: string
  phone?: string
  role: 'student' | 'tutor'
}

const form = ref<RegisterForm>({
  email: '',
  password: '',
  first_name: '',
  last_name: '',
  phone: '',
  role: 'student'
})

const handleRegister = async () => {
  if (!form.value.email || !form.value.password || !form.value.first_name || !form.value.last_name) {
    ElMessage.warning('Заполните все обязательные поля')
    return
  }
  
  if (form.value.password.length < 6) {
    ElMessage.warning('Пароль должен быть не менее 6 символов')
    return
  }
  
  loading.value = true
  const success = await authStore.register(form.value)
  loading.value = false
  
  if (success) {
    router.push('/login')
  }
}
</script>

<style scoped>
:deep(.el-radio__input.is-checked .el-radio__inner) {
  background-color: #2c3e50;
  border-color: #2c3e50;
}

:deep(.el-radio__input.is-checked + .el-radio__label) {
  color: #2c3e50;
}

:deep(.el-button--text) {
  color: #2c3e50 !important;
}

:deep(.el-button--text:hover) {
  color: #34495e !important;
}
</style>