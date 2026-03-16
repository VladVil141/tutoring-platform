<template>
  <div id="app">
    <el-container>
      <el-header style="background-color: #2c3e50; color: white; padding: 0 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; height: 60px; max-width: 1200px; margin: 0 auto;">
          <div style="cursor: pointer; font-size: 20px; font-weight: 500;" @click="$router.push('/')">
            Tutoring Platform
          </div>
          
          <div style="display: flex; gap: 15px;">
            <template v-if="authStore.isAuthenticated">
              <el-button type="text" style="color: white;" @click="$router.push('/cabinet')">
                Личный кабинет
              </el-button>
              <el-button type="text" style="color: white;" @click="handleLogout">
                Выйти
              </el-button>
            </template>
            <template v-else>
              <el-button type="text" style="color: white;" @click="$router.push('/login')">
                Вход
              </el-button>
              <el-button type="text" style="color: white;" @click="$router.push('/register')">
                Регистрация
              </el-button>
            </template>
          </div>
        </div>
      </el-header>
      
      <el-main style="min-height: calc(100vh - 120px); padding: 20px; background: #f5f5f5;">
        <div style="max-width: 1200px; margin: 0 auto;">
          <router-view />
        </div>
      </el-main>
      
      <el-footer style="background-color: #2c3e50; padding: 0;">
        <div style="text-align: center; color: white; padding: 15px 0;">
          © 2026 Tutoring Platform
        </div>
      </el-footer>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from './stores/auth';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

const handleLogout = () => {
  authStore.logout();
  router.push('/');
};
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.el-button--text {
  color: white !important;
}

.el-button--primary {
  background-color: #2c3e50 !important;
  border-color: #2c3e50 !important;
}

.el-button--primary:hover {
  background-color: #34495e !important;
  border-color: #34495e !important;
}
</style>