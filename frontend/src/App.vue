<template>
  <div id="app">
    <el-container>
      <el-header style="background-color: #2c3e50; color: white; padding: 0 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; height: 60px; max-width: 1200px; margin: 0 auto;">
          <div style="cursor: pointer; font-size: 20px; font-weight: 500;" @click="$router.push('/')">
            Tutoring Platform
          </div>
          
          <div style="display: flex; gap: 15px; align-items: center;">
            <el-button type="text" style="color: white; margin-right: 5px;" @click="$router.push('/catalog')">
              Каталог
            </el-button>
            <el-button type="text" style="color: white;" @click="$router.push('/schedule')">
              Календарь
            </el-button>
            
            <template v-if="authStore.isAuthenticated">
              <el-badge :value="unreadMessagesCount" :hidden="unreadMessagesCount === 0">
                <el-button type="text" style="color: white;" @click="$router.push('/chats')">
                  Сообщения
                </el-button>
              </el-badge>
              
              <el-badge :value="unreadNotificationsCount" :hidden="unreadNotificationsCount === 0">
                <el-button type="text" style="color: white;" @click="showNotifications = true">
                  🔔
                </el-button>
              </el-badge>
              
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

    <!-- Панель уведомлений -->
    <el-drawer
      v-model="showNotifications"
      title="Уведомления"
      direction="rtl"
      size="400px"
    >
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
          <span>Уведомления</span>
          <el-button size="small" type="info" plain @click="markAllAsRead">
            Отметить все как прочитанные
          </el-button>
        </div>
      </template>
      
      <div v-if="notifications.length === 0" style="text-align: center; color: #999; padding: 20px;">
        Нет уведомлений
      </div>
      <div 
        v-for="notif in notifications" 
        :key="notif.id" 
        class="notification-item"
        :class="{ 'notification-unread': !notif.read }"
        @click="markAsRead(notif.id)"
      >
        <div class="notification-title">{{ notif.title }}</div>
        <div class="notification-message">{{ notif.message }}</div>
        <div class="notification-time">{{ formatTime(notif.timestamp) }}</div>
      </div>
    </el-drawer>

    <!-- Всплывающие уведомления -->
    <el-alert
      v-for="(toast, index) in toasts"
      :key="index"
      :title="toast.title"
      :description="toast.message"
      type="info"
      :closable="true"
      show-icon
      style="position: fixed; bottom: 20px; right: 20px; width: 300px; z-index: 2000; margin-bottom: 10px;"
      @close="removeToast(index)"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch, ref } from 'vue';
import { useAuthStore } from './stores/auth';
import { useRouter } from 'vue-router';
import { socketService } from './services/socket';
import { useBookingStore } from './stores/booking';
import { useGroupBookingStore } from './stores/groupBooking';
import { useScheduleStore } from './stores/schedule';
import { useAttendanceStore } from './stores/attendance';
import { ElMessage } from 'element-plus';

const authStore = useAuthStore();
const router = useRouter();
const bookingStore = useBookingStore();
const groupBookingStore = useGroupBookingStore();
const scheduleStore = useScheduleStore();
const attendanceStore = useAttendanceStore();

const showNotifications = ref(false);
const notifications = ref<any[]>([]);
const toasts = ref<any[]>([]);
const unreadMessagesCount = ref(0);
const unreadNotificationsCount = ref(0);

// Функции для уведомлений
const addNotification = (title: string, message: string, data: any) => {
  notifications.value.unshift({
    id: Date.now(),
    title,
    message,
    data,
    timestamp: new Date().toISOString(),
    read: false,
  });
  if (notifications.value.length > 50) {
    notifications.value.pop();
  }
  updateUnreadCount();
};

const markAsRead = (id: number) => {
  const notif = notifications.value.find(n => n.id === id);
  if (notif && !notif.read) {
    notif.read = true;
    updateUnreadCount();
  }
};

const markAllAsRead = () => {
  notifications.value.forEach(notif => {
    notif.read = true;
  });
  updateUnreadCount();
  ElMessage.success('Все уведомления отмечены как прочитанные');
};

const updateUnreadCount = () => {
  unreadNotificationsCount.value = notifications.value.filter(n => !n.read).length;
};

const addToast = (title: string, message: string) => {
  const id = Date.now();
  toasts.value.push({ id, title, message });
  setTimeout(() => {
    removeToastById(id);
  }, 5000);
};

const removeToast = (index: number) => {
  toasts.value.splice(index, 1);
};

const removeToastById = (id: number) => {
  const index = toasts.value.findIndex(t => t.id === id);
  if (index !== -1) toasts.value.splice(index, 1);
};

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleString('ru-RU');
};

const getStatusText = (status: string): string => {
  const map: Record<string, string> = {
    pending: 'ожидает',
    confirmed: 'подтверждена',
    cancelled: 'отменена',
    completed: 'завершена',
  };
  return map[status] || status;
};

// Инициализация WebSocket и сторов
function initWebSocketsAndStores() {
  const token = localStorage.getItem('token');
  if (token && authStore.isAuthenticated) {
    socketService.connect(token);
    
    bookingStore.initWebSocketListeners();
    groupBookingStore.initWebSocketListeners();
    scheduleStore.initWebSocketListeners();
    attendanceStore.initWebSocketListeners();
    
    initEventListeners();
  }
}

// Инициализация слушателей событий для уведомлений
const initEventListeners = () => {
  socketService.on('new_message', (data: any) => {
    const currentUserId = authStore.user?.id;
    if (currentUserId && data.sender_id === currentUserId) return;
    
    const senderName = data.sender?.profile?.first_name 
      ? `${data.sender.profile.first_name} ${data.sender.profile.last_name}`
      : (data.sender?.email?.split('@')[0] || 'Пользователь');
    
    const messageText = data.text && data.text.length > 50 
      ? data.text.substring(0, 50) + '...' 
      : (data.text || '');
    
    addNotification('Новое сообщение', `${senderName}: ${messageText}`, data);
    addToast('Новое сообщение', `${senderName}: ${messageText.substring(0, 30)}...`);
    unreadMessagesCount.value++;
  });

  socketService.on('message_deleted', (data: any) => {
    addNotification('Сообщение удалено', `Сообщение было удалено`, data);
    addToast('Сообщение удалено', `Сообщение удалено`);
  });

  socketService.on('booking:new', (data: any) => {
    addNotification('Новая заявка', `От: ${data.studentName}`, data);
    addToast('Новая заявка', `От: ${data.studentName}`);
  });

  socketService.on('booking:updated', (data: any) => {
    const statusText = getStatusText(data.status);
    addNotification('Статус заявки изменен', `Статус: ${statusText}`, data);
    addToast('Статус заявки изменен', `Статус: ${statusText}`);
  });

  socketService.on('reschedule:requested', (data: any) => {
    addNotification('Запрос на перенос', `${data.requesterName} просит перенести занятие`, data);
    addToast('Запрос на перенос', `${data.requesterName} просит перенести занятие`);
  });

  socketService.on('reschedule:status_changed', (data: any) => {
    const statusText = data.status === 'confirmed' ? 'одобрен' : 'отклонен';
    addNotification('Статус переноса', `Запрос на перенос ${statusText}`, data);
    addToast('Статус переноса', `Запрос на перенос ${statusText}`);
  });

  socketService.on('attendance:marked', (data: any) => {
    const attendedText = data.attended ? 'посещено' : 'пропущено';
    addNotification('Отметка посещения', `Занятие ${attendedText}`, data);
    addToast('Отметка посещения', `Занятие ${attendedText}`);
  });

  socketService.on('group_booking:new', (data: any) => {
    addNotification('Новая групповая заявка', `От: ${data.studentName} на "${data.groupTitle}"`, data);
    addToast('Новая групповая заявка', `От: ${data.studentName}`);
  });

  socketService.on('group:students_changed', (data: any) => {
    const actionText = data.action === 'joined' ? 'присоединился' : 'покинул';
    addNotification('Состав группы', `${data.studentName} ${actionText} группу (${data.currentCount}/${data.maxStudents})`, data);
    addToast('Состав группы', `${data.studentName} ${actionText} группу`);
  });
};

onMounted(() => {
  initWebSocketsAndStores();
});

watch(() => authStore.isAuthenticated, (isAuth) => {
  if (isAuth) {
    initWebSocketsAndStores();
  } else {
    socketService.disconnect();
    notifications.value = [];
    toasts.value = [];
    unreadMessagesCount.value = 0;
    unreadNotificationsCount.value = 0;
  }
});

onUnmounted(() => {
  socketService.disconnect();
});

const handleLogout = () => {
  authStore.logout();
  socketService.disconnect();
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

.notification-item {
  padding: 12px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  transition: background 0.2s;
}

.notification-item:hover {
  background-color: #f5f5f5;
}

.notification-unread {
  background-color: #ecf5ff;
  border-left: 3px solid #409eff;
}

.notification-title {
  font-weight: bold;
  margin-bottom: 5px;
  color: #2c3e50;
}

.notification-message {
  color: #666;
  font-size: 13px;
  margin-bottom: 5px;
  word-break: break-word;
}

.notification-time {
  color: #999;
  font-size: 11px;
}
</style>