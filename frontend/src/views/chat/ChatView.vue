<template>
  <div class="chat-view">
    <el-card class="chat-card">
      <template #header>
        <div class="chat-header">
          <el-button @click="router.back()" text>
            <el-icon><ArrowLeft /></el-icon> Назад
          </el-button>
          <h3>{{ chatName }}</h3>
          <el-dropdown v-if="isGroupChat && isTutor">
            <el-button text>
              <el-icon><MoreFilled /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="deleteChatForAll">
                  <span style="color: #f56c6c;">Удалить чат для всех</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-button v-else text @click="deleteChat">
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </template>

      <div class="messages-container" ref="messagesContainer">
        <div v-if="loading" class="loading">
          <el-skeleton :rows="3" animated />
        </div>
        <div v-else-if="messages.length === 0" class="empty">
          <el-empty description="Нет сообщений" />
        </div>
        <div v-else class="messages-list">
          <div
            v-for="message in messages"
            :key="message.id"
            class="message"
            :class="{ 'own-message': message.sender_id === authStore.user?.id }"
          >
            <div class="message-avatar">
              <el-avatar :size="36" :src="message.sender?.profile?.avatar_url">
                {{ message.sender?.profile?.first_name?.charAt(0) }}
              </el-avatar>
            </div>
            <div class="message-content">
              <div class="message-sender">{{ message.sender?.profile?.first_name }} {{ message.sender?.profile?.last_name }}</div>
              <div class="message-text">{{ message.text }}</div>
              <div class="message-time">{{ formatTime(message.created_at) }}</div>
            </div>
            <div class="message-actions" v-if="message.sender_id === authStore.user?.id">
              <el-dropdown>
                <el-button text size="small">
                  <el-icon><More /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="deleteMessage(message.id)">
                      Удалить
                    </el-dropdown-item>
                    <el-dropdown-item v-if="isPrivateChat" @click="deleteMessageForBoth(message.id)">
                      Удалить у собеседника
                    </el-dropdown-item>
                    <el-dropdown-item v-if="isGroupChat && isTutor" @click="deleteMessageForUser(message.id)">
                      Удалить для ученика
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </div>
      </div>

      <div class="message-input">
        <el-input
          v-model="newMessage"
          type="textarea"
          :rows="2"
          placeholder="Введите сообщение..."
          @keydown.enter.prevent="sendMessage"
        />
        <el-button type="primary" @click="sendMessage" :loading="sending">
          Отправить
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useChatStore } from '../../stores/chat';
import { useAuthStore } from '../../stores/auth';
import { socketService } from '../../services/socket';
import { ArrowLeft, MoreFilled, Delete, More } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';

const route = useRoute();
const router = useRouter();
const chatStore = useChatStore();
const authStore = useAuthStore();

const chatType = computed(() => route.params.type as 'private' | 'group');
const chatId = computed(() => Number(route.params.id));
const isPrivateChat = computed(() => chatType.value === 'private');
const isGroupChat = computed(() => chatType.value === 'group');
const isTutor = computed(() => authStore.isTutor);

const messages = computed(() => chatStore.currentMessages);
const loading = ref(false);
const sending = ref(false);
const newMessage = ref('');
const messagesContainer = ref<HTMLElement | null>(null);
const chatName = ref('');

// Загрузить сообщения
async function loadMessages() {
  loading.value = true;
  await chatStore.fetchMessages(chatType.value, chatId.value);
  loading.value = false;
  await scrollToBottom();
}

// Отправить сообщение
async function sendMessage() {
  if (!newMessage.value.trim()) return;

  console.log('Sending message:', { chatType: chatType.value, chatId: chatId.value, text: newMessage.value }); // 👈 добавить
  
  sending.value = true;
  chatStore.sendMessage(chatType.value, chatId.value, newMessage.value);
  newMessage.value = '';
  sending.value = false;
  await scrollToBottom();
}

// Прокрутка вниз
async function scrollToBottom() {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
}

// Форматирование времени
function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

// Удалить сообщение
async function deleteMessage(messageId: number) {
  try {
    await ElMessageBox.confirm('Удалить сообщение?', 'Подтверждение', {
      confirmButtonText: 'Да',
      cancelButtonText: 'Нет',
      type: 'warning',
    });
    socketService.send('delete_message', { message_id: messageId });
  } catch {
    // отмена
  }
}

// Удалить сообщение у собеседника
async function deleteMessageForBoth(messageId: number) {
  try {
    await ElMessageBox.confirm('Удалить сообщение у собеседника?', 'Подтверждение', {
      confirmButtonText: 'Да',
      cancelButtonText: 'Нет',
      type: 'warning',
    });
    socketService.send('delete_message', { message_id: messageId, delete_for_both: true });
  } catch {
    // отмена
  }
}

// Удалить сообщение для ученика (групповой чат)
async function deleteMessageForUser(messageId: number) {
  // TODO: выбрать ученика
  ElMessage.info('Выбор ученика будет доступен позже');
}

// Удалить чат
async function deleteChat() {
  try {
    await ElMessageBox.confirm('Удалить этот чат?', 'Подтверждение', {
      confirmButtonText: 'Да',
      cancelButtonText: 'Нет',
      type: 'warning',
    });
    
    if (isPrivateChat.value) {
      await chatStore.deletePrivateChat(chatId.value);
    } else {
      await chatStore.deleteGroupChat(chatId.value);
    }
    router.push('/chats');
  } catch {
    // отмена
  }
}

// Удалить групповой чат для всех
async function deleteChatForAll() {
  try {
    await ElMessageBox.confirm('Удалить чат для всех учеников?', 'Подтверждение', {
      confirmButtonText: 'Да',
      cancelButtonText: 'Нет',
      type: 'warning',
    });
    await chatStore.deleteGroupChatForAll(chatId.value);
    router.push('/chats');
  } catch {
    // отмена
  }
}

// Обработчики WebSocket
function onNewMessage(message: any) {
  if (message.chat_id === chatId.value && message.chat_type === chatType.value) {
    chatStore.addMessage(message);
    scrollToBottom();
  }
}

function onMessageDeleted(data: any) {
  chatStore.updateMessageDeleted(data.message_id, data);
}

onMounted(async () => {
  // Сначала загружаем список чатов (если ещё не загружен)
  if (chatStore.privateChats.length === 0 && chatStore.groupChats.length === 0) {
    await chatStore.fetchChats();
  }
  
  // Потом загружаем сообщения
  await loadMessages();
  
  // Получаем имя чата
  if (isPrivateChat.value) {
    const chat = chatStore.privateChats.find(c => c.id === chatId.value);
    if (chat) {
      chatName.value = authStore.isStudent ? 
        `${chat.tutor.profile.first_name} ${chat.tutor.profile.last_name}` :
        `${chat.student.profile.first_name} ${chat.student.profile.last_name}`;
    }
  } else {
    const chat = chatStore.groupChats.find(c => c.id === chatId.value);
    if (chat) {
      chatName.value = chat.group_listing.subject;
    }
  }
  
  // ✅ ПОДПИСКА НА WEBSOCKET (обязательно!)
  socketService.on('new_message', onNewMessage);
  socketService.on('message_deleted', onMessageDeleted);
});

onUnmounted(() => {
  socketService.off('new_message', onNewMessage);
  socketService.off('message_deleted', onMessageDeleted);
  chatStore.clearMessages();
});
</script>

<style scoped>
.chat-view {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  height: calc(100vh - 100px);
}

.chat-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-header h3 {
  margin: 0;
  color: #2c3e50;
  flex: 1;
  text-align: center;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #fafafa;
  border-radius: 8px;
  margin: 10px 0;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message {
  display: flex;
  gap: 12px;
  max-width: 80%;
}

.message.own-message {
  flex-direction: row-reverse;
  margin-left: auto;
}

.message.own-message .message-content {
  background: #409eff;
  color: white;
}

.message-content {
  background: white;
  padding: 10px 14px;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  position: relative;
}

.message-sender {
  font-size: 12px;
  font-weight: 500;
  color: #909399;
  margin-bottom: 4px;
}

.own-message .message-sender {
  color: rgba(255,255,255,0.8);
}

.message-text {
  word-break: break-word;
  line-height: 1.4;
}

.message-time {
  font-size: 10px;
  color: #c0c4cc;
  margin-top: 4px;
  text-align: right;
}

.own-message .message-time {
  color: rgba(255,255,255,0.7);
}

.message-actions {
  opacity: 0;
  transition: opacity 0.2s;
}

.message:hover .message-actions {
  opacity: 1;
}

.message-input {
  display: flex;
  gap: 10px;
  padding-top: 15px;
  border-top: 1px solid #e4e7ed;
}

.message-input .el-textarea {
  flex: 1;
}

.message-input .el-button {
  align-self: flex-end;
  height: 50px;
}

.loading, .empty {
  padding: 40px;
  text-align: center;
}

@media (max-width: 768px) {
  .chat-view {
    padding: 10px;
    height: calc(100vh - 60px);
  }
  
  .message {
    max-width: 90%;
  }
}
</style>