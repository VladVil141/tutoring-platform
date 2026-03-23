import { defineStore } from 'pinia';
import { ref } from 'vue';
import { chatService } from '../services/api';
import { socketService } from '../services/socket';
import { ElMessage } from 'element-plus';

export interface Message {
  id: number;
  chat_type: 'private' | 'group';
  chat_id: number;
  sender_id: number;
  text: string;
  is_read: boolean;
  created_at: string;
  sender?: {
    id: number;
    profile: {
      first_name: string;
      last_name: string;
      avatar_url: string | null;
    };
  };
}

export interface PrivateChat {
  id: number;
  student_id: number;
  tutor_id: number;
  student: {
    id: number;
    profile: { first_name: string; last_name: string; avatar_url: string | null };
  };
  tutor: {
    id: number;
    profile: { first_name: string; last_name: string; avatar_url: string | null };
  };
}

export interface GroupChat {
  id: number;
  group_listing_id: number;
  tutor_id: number;
  group_listing: {
    id: number;
    subject: string;
  };
  tutor: {
    id: number;
    profile: { first_name: string; last_name: string; avatar_url: string | null };
  };
}

export const useChatStore = defineStore('chat', () => {
  const privateChats = ref<PrivateChat[]>([]);
  const groupChats = ref<GroupChat[]>([]);
  const currentMessages = ref<Message[]>([]);
  const loading = ref(false);

  // Загрузить все чаты
  async function fetchChats() {
    try {
      loading.value = true;
      const response = await chatService.getChats();
      privateChats.value = response.data.private;
      groupChats.value = response.data.group;
    } catch (error) {
      ElMessage.error('Ошибка загрузки чатов');
    } finally {
      loading.value = false;
    }
  }

  // Создать личный чат
  async function createPrivateChat(tutorId: number) {
    try {
      const response = await chatService.createPrivateChat(tutorId);
      await fetchChats();
      return response.data;
    } catch (error) {
      ElMessage.error('Ошибка создания чата');
      return null;
    }
  }

  // Загрузить сообщения чата
  async function fetchMessages(chatType: 'private' | 'group', chatId: number) {
    try {
      loading.value = true;
      const response = await chatService.getMessages(chatType, chatId);
      currentMessages.value = response.data;
      return response.data;
    } catch (error) {
      ElMessage.error('Ошибка загрузки сообщений');
      return [];
    } finally {
      loading.value = false;
    }
  }

  // Отправить сообщение
  function sendMessage(chatType: 'private' | 'group', chatId: number, text: string) {
    socketService.send('send_message', { chat_type: chatType, chat_id: chatId, text });
  }

  // Добавить сообщение в текущий чат (при получении нового)
  function addMessage(message: Message) {
    if (currentMessages.value.some(m => m.id === message.id)) return;
    currentMessages.value.push(message);
  }

  // Удалить сообщение из чата
  function removeMessage(messageId: number) {
    currentMessages.value = currentMessages.value.filter(m => m.id !== messageId);
  }

  // Обновить статус сообщения (при удалении)
  function updateMessageDeleted(messageId: number, data: any) {
    const index = currentMessages.value.findIndex(m => m.id === messageId);
    if (index !== -1) {
      const message = currentMessages.value[index];
      if (message) {
        if (data.deleted_for_all) {
          // Удаляем сообщение полностью
          currentMessages.value.splice(index, 1);
        } else if (data.deleted_for_user_id) {
          message.text = '[Сообщение удалено для пользователя]';
        } else {
          message.text = '[Сообщение удалено]';
        }
      }
    }
  }

  // Удалить личный чат у себя
  async function deletePrivateChat(chatId: number) {
    try {
      await chatService.deletePrivateChat(chatId);
      await fetchChats();
      ElMessage.success('Чат удален');
    } catch (error) {
      ElMessage.error('Ошибка удаления чата');
    }
  }

  // Удалить групповой чат у себя
  async function deleteGroupChat(chatId: number) {
    try {
      await chatService.deleteGroupChat(chatId);
      await fetchChats();
      ElMessage.success('Чат удален');
    } catch (error) {
      ElMessage.error('Ошибка удаления чата');
    }
  }

  // Удалить групповой чат для всех (только репетитор)
  async function deleteGroupChatForAll(chatId: number) {
    try {
      await chatService.deleteGroupChatForAll(chatId);
      await fetchChats();
      ElMessage.success('Чат удален для всех');
    } catch (error) {
      ElMessage.error('Ошибка удаления чата');
    }
  }

  // Очистить текущие сообщения
  function clearMessages() {
    currentMessages.value = [];
  }

  return {
    privateChats,
    groupChats,
    currentMessages,
    loading,
    fetchChats,
    createPrivateChat,
    fetchMessages,
    sendMessage,
    addMessage,
    removeMessage,
    updateMessageDeleted,
    deletePrivateChat,
    deleteGroupChat,
    deleteGroupChatForAll,
    clearMessages,
  };
});