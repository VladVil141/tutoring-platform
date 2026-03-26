// src/services/socket.ts
import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private eventsSocket: Socket | null = null;  // 👈 новый для events
  private listeners: Map<string, ((...args: any[]) => void)[]> = new Map();

  connect(token: string) {
    if (this.socket?.connected) return;

    // 1. Чат (основной namespace)
    this.socket = io('http://localhost:3000', {
      auth: { token },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('📨 Chat WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('📨 Chat WebSocket disconnected');
    });

    // Обработка входящих событий чата
    this.socket.on('new_message', (data) => {
      this.emit('new_message', data);
    });

    this.socket.on('message_deleted', (data) => {
      this.emit('message_deleted', data);
    });

    // 2. События (namespace 'events') 👈 НОВЫЙ
    this.eventsSocket = io('http://localhost:3000/events', {
      auth: { token },
      transports: ['websocket'],
    });

    this.eventsSocket.on('connect', () => {
      console.log('📡 Events WebSocket connected');
    });

    this.eventsSocket.on('disconnect', () => {
      console.log('📡 Events WebSocket disconnected');
    });

    // Обработка входящих событий (real-time обновления)
    this.eventsSocket.on('connected', (data) => {
      console.log('Events connected:', data);
    });

    // Новая заявка
    this.eventsSocket.on('booking:new', (data) => {
      console.log('Новая заявка:', data);
      this.emit('booking:new', data);
    });

    // Изменение статуса заявки
    this.eventsSocket.on('booking:updated', (data) => {
      console.log('Статус заявки изменен:', data);
      this.emit('booking:updated', data);
    });

    // Изменение статуса заявки (старое событие для обратной совместимости)
    this.eventsSocket.on('booking:status_changed', (data) => {
      console.log('Статус заявки изменен (old):', data);
      this.emit('booking:status_changed', data);
    });

    // Запрос на перенос
    this.eventsSocket.on('reschedule:requested', (data) => {
      console.log('Запрос на перенос:', data);
      this.emit('reschedule:requested', data);
    });

    // Статус переноса
    this.eventsSocket.on('reschedule:status_changed', (data) => {
      console.log('Статус переноса:', data);
      this.emit('reschedule:status_changed', data);
    });

    // Отметка посещения
    this.eventsSocket.on('attendance:marked', (data) => {
      console.log('Отметка посещения:', data);
      this.emit('attendance:marked', data);
    });

    // Обновление календаря
    this.eventsSocket.on('calendar:updated', (data) => {
      console.log('Календарь обновлен:', data);
      this.emit('calendar:updated', data);
    });

    // Новая групповая заявка
    this.eventsSocket.on('group_booking:new', (data) => {
      console.log('Новая групповая заявка:', data);
      this.emit('group_booking:new', data);
    });

    // Статус групповой заявки
    this.eventsSocket.on('group_booking:status_changed', (data) => {
      console.log('Статус групповой заявки:', data);
      this.emit('group_booking:status_changed', data);
    });

    // Изменение состава группы
    this.eventsSocket.on('group:students_changed', (data) => {
      console.log('Состав группы изменен:', data);
      this.emit('group:students_changed', data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    if (this.eventsSocket) {
      this.eventsSocket.disconnect();
      this.eventsSocket = null;
    }
  }

  // Отправить сообщение (для чата)
  send(event: string, data: any) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  // Подписаться на событие
  on(event: string, callback: (...args: any[]) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  // Отписаться от события
  off(event: string, callback: (...args: any[]) => void) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) callbacks.splice(index, 1);
    }
  }

  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }

  // Проверка подключения
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  isEventsConnected(): boolean {
    return this.eventsSocket?.connected || false;
  }
}

export const socketService = new SocketService();