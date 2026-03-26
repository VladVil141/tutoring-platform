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
  
  // 👇 Хранилище сообщений по чатам (для превью в списке)
  const messagesByChat = ref<Map<string, Message[]>>(new Map());
  const unreadCounts = ref<Map<string, number>>(new Map());

  // 👇 Получить ключ чата
function getChatKey(chatType: 'private' | 'group', chatId: number): string {
  return `${chatType}:${chatId}`;
}

// 👇 Получить сообщения для чата (для превью)
function getMessagesForChat(chatId: number): Message[] {
  const key = getChatKey('private', chatId);
  const messages = messagesByChat.value.get(key);
  return messages || [];
}

// 👇 Получить последнее сообщение для чата
function getLastMessageForChat(chatId: number): string {
  const messages = getMessagesForChat(chatId);
  if (!messages || messages.length === 0) return 'Нет сообщений';
  
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage?.text) return 'Нет сообщений';
  
  const text = lastMessage.text;
  return text.length > 50 ? text.substring(0, 50) + '...' : text;
}

  // 👇 Получить количество непрочитанных сообщений
  function getUnreadCount(chatId: number): number {
    const key = getChatKey('private', chatId);
    return unreadCounts.value.get(key) || 0;
  }

  // 👇 Добавить сообщение и обновить непрочитанные
  function addMessage(message: Message) {
    // Добавляем в текущий чат, если открыт
    if (currentMessages.value.some(m => m.id === message.id)) return;
    currentMessages.value.push(message);
    
    // Сохраняем в общее хранилище для превью
    const key = getChatKey(message.chat_type, message.chat_id);
    if (!messagesByChat.value.has(key)) {
      messagesByChat.value.set(key, []);
    }
    messagesByChat.value.get(key)!.push(message);
    
    // Увеличиваем счетчик непрочитанных (если это не текущий открытый чат)
    // TODO: нужно знать текущий открытый чат
  }

  // 👇 Загрузить все чаты и последние сообщения
  async function fetchChatsWithMessages() {
    await fetchChats();
    // Загружаем последние сообщения для каждого чата
    for (const chat of privateChats.value) {
      await fetchMessagesForPreview('private', chat.id);
    }
    for (const chat of groupChats.value) {
      await fetchMessagesForPreview('group', chat.id);
    }
  }

  // 👇 Загрузить последние сообщения для превью
  async function fetchMessagesForPreview(chatType: 'private' | 'group', chatId: number, limit: number = 1) {
    try {
      const response = await chatService.getMessages(chatType, chatId, limit);
      const key = getChatKey(chatType, chatId);
      messagesByChat.value.set(key, response.data);
    } catch (error) {
      console.error('Ошибка загрузки сообщений для превью:', error);
    }
  }

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
      
      // Сохраняем в общее хранилище
      const key = getChatKey(chatType, chatId);
      messagesByChat.value.set(key, response.data);
      
      // Сбрасываем счетчик непрочитанных для этого чата
      unreadCounts.value.set(key, 0);
      
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
    fetchChatsWithMessages,
    createPrivateChat,
    fetchMessages,
    fetchMessagesForPreview,
    sendMessage,
    addMessage,
    removeMessage,
    updateMessageDeleted,
    deletePrivateChat,
    deleteGroupChat,
    deleteGroupChatForAll,
    clearMessages,
    getMessagesForChat,
    getLastMessageForChat,
    getUnreadCount,
  };
});