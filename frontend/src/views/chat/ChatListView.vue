<template>
  <div class="chat-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <h2>Сообщения</h2>
          <el-input
            v-model="searchQuery"
            placeholder="Поиск..."
            prefix-icon="Search"
            clearable
            style="width: 250px;"
          />
        </div>
      </template>

      <div v-loading="loading" class="chat-list-container">
        <!-- Личные чаты -->
        <div v-if="filteredPrivateChats.length" class="chat-section">
          <h3>Личные чаты</h3>
          <div
            v-for="chat in filteredPrivateChats"
            :key="chat.id"
            class="chat-item"
            :class="{ active: activeChat?.id === chat.id && activeChat?.type === 'private' }"
            @click="openChat('private', chat.id, getChatName(chat))"
          >
            <el-avatar :size="48" :src="getChatAvatar(chat)">
              {{ getChatInitials(chat) }}
            </el-avatar>
            <div class="chat-info">
              <div class="chat-name">{{ getChatName(chat) }}</div>
              <div class="chat-preview">{{ getLastMessage(chat.id) || 'Нет сообщений' }}</div>
            </div>
            <div v-if="hasUnread(chat.id)" class="unread-badge"></div>
          </div>
        </div>

        <!-- Групповые чаты -->
        <div v-if="filteredGroupChats.length" class="chat-section">
          <h3>Групповые чаты</h3>
          <div
            v-for="chat in filteredGroupChats"
            :key="chat.id"
            class="chat-item"
            :class="{ active: activeChat?.id === chat.id && activeChat?.type === 'group' }"
            @click="openChat('group', chat.id, chat.group_listing.subject)"
          >
            <el-avatar :size="48" icon="UserFilled" style="background: #409eff;" />
            <div class="chat-info">
              <div class="chat-name">{{ chat.group_listing.subject }}</div>
              <div class="chat-preview">{{ getLastMessage(chat.id) || 'Нет сообщений' }}</div>
            </div>
            <div v-if="hasUnread(chat.id)" class="unread-badge"></div>
          </div>
        </div>

        <el-empty v-if="!filteredPrivateChats.length && !filteredGroupChats.length" description="Нет чатов" />
      </div>
    </el-card>

    <!-- Кнопка создания чата (опционально) -->
    <el-button
      v-if="authStore.isStudent && showCreateButton"
      type="primary"
      class="create-chat-btn"
      @click="openCreateChatDialog"
    >
      + Новый чат
    </el-button>

    <!-- Диалог создания чата -->
    <el-dialog v-model="createChatVisible" title="Новый чат" width="400px">
      <el-select v-model="selectedTutor" placeholder="Выберите репетитора" style="width: 100%;">
        <el-option
          v-for="tutor in tutors"
          :key="tutor.id"
          :label="`${tutor.first_name} ${tutor.last_name}`"
          :value="tutor.id"
        />
      </el-select>
      <template #footer>
        <el-button @click="createChatVisible = false">Отмена</el-button>
        <el-button type="primary" @click="createChat" :loading="creating">
          Создать
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useChatStore } from '../../stores/chat';
import { useAuthStore } from '../../stores/auth';
import { ElMessage } from 'element-plus';

const router = useRouter();
const chatStore = useChatStore();
const authStore = useAuthStore();

const loading = computed(() => chatStore.loading);
const searchQuery = ref('');
const activeChat = ref<{ type: 'private' | 'group'; id: number; name: string } | null>(null);
const createChatVisible = ref(false);
const selectedTutor = ref<number | null>(null);
const creating = ref(false);
const showCreateButton = ref(true);
const tutors = ref<any[]>([]);

// Фильтрация
const filteredPrivateChats = computed(() => {
  if (!searchQuery.value) return chatStore.privateChats;
  return chatStore.privateChats.filter(chat => 
    getChatName(chat).toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

const filteredGroupChats = computed(() => {
  if (!searchQuery.value) return chatStore.groupChats;
  return chatStore.groupChats.filter(chat => 
    chat.group_listing.subject.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

// Вспомогательные функции
function getChatName(chat: any): string {
  if (authStore.isStudent) {
    return `${chat.tutor.profile.first_name} ${chat.tutor.profile.last_name}`;
  } else {
    return `${chat.student.profile.first_name} ${chat.student.profile.last_name}`;
  }
}

function getChatInitials(chat: any): string {
  if (authStore.isStudent) {
    return `${chat.tutor.profile.first_name.charAt(0)}${chat.tutor.profile.last_name.charAt(0)}`;
  } else {
    return `${chat.student.profile.first_name.charAt(0)}${chat.student.profile.last_name.charAt(0)}`;
  }
}

function getChatAvatar(chat: any): string {
  if (authStore.isStudent) {
    return chat.tutor.profile.avatar_url || '';
  } else {
    return chat.student.profile.avatar_url || '';
  }
}

function getLastMessage(chatId: number): string {
  // TODO: получить последнее сообщение из store
  return '';
}

function hasUnread(chatId: number): boolean {
  // TODO: проверить непрочитанные сообщения
  return false;
}

function openChat(type: 'private' | 'group', id: number, name: string) {
  activeChat.value = { type, id, name };
  router.push(`/chat/${type}/${id}`);
}

async function openCreateChatDialog() {
  createChatVisible.value = true;
  // TODO: загрузить список репетиторов
}

async function createChat() {
  if (!selectedTutor.value) {
    ElMessage.warning('Выберите репетитора');
    return;
  }
  
  creating.value = true;
  const chat = await chatStore.createPrivateChat(selectedTutor.value);
  creating.value = false;
  
  if (chat) {
    createChatVisible.value = false;
    openChat('private', chat.id, getChatName(chat));
  }
}

onMounted(async () => {
  await chatStore.fetchChats();
  
  // Подписываемся на новые сообщения
  // socketService.on('new_message', (message) => {
  //   chatStore.addMessage(message);
  // });
});
</script>

<style scoped>
.chat-list {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  position: relative;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
}

.card-header h2 {
  margin: 0;
  color: #2c3e50;
}

.chat-list-container {
  max-height: 70vh;
  overflow-y: auto;
}

.chat-section {
  margin-bottom: 20px;
}

.chat-section h3 {
  font-size: 14px;
  color: #909399;
  margin-bottom: 10px;
  padding-left: 10px;
}

.chat-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s;
  position: relative;
}

.chat-item:hover {
  background: #f5f7fa;
}

.chat-item.active {
  background: #ecf5ff;
}

.chat-info {
  flex: 1;
}

.chat-name {
  font-weight: 500;
  color: #2c3e50;
  margin-bottom: 4px;
}

.chat-preview {
  font-size: 13px;
  color: #909399;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
}

.unread-badge {
  width: 10px;
  height: 10px;
  background: #f56c6c;
  border-radius: 50%;
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
}

.create-chat-btn {
  position: fixed;
  bottom: 30px;
  right: 30px;
  border-radius: 50%;
  width: 56px;
  height: 56px;
  font-size: 24px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

@media (max-width: 768px) {
  .chat-list {
    padding: 10px;
  }
  
  .chat-preview {
    max-width: 200px;
  }
}
</style>