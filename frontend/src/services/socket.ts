import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, ((...args: any[]) => void)[]> = new Map();

  connect(token: string) {
    console.log('Connecting WebSocket with token:', token); // 👈 добавить

    if (this.socket?.connected) return;

    this.socket = io('http://localhost:3000', {
      auth: { token },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    // Обработка входящих событий
    this.socket.on('new_message', (data) => {
      this.emit('new_message', data);
    });

    this.socket.on('message_deleted', (data) => {
      this.emit('message_deleted', data);
    });

    this.socket.on('new_booking', (data) => {
      this.emit('new_booking', data);
    });

    this.socket.on('booking_status_changed', (data) => {
      this.emit('booking_status_changed', data);
    });

    this.socket.on('group_students_changed', (data) => {
      this.emit('group_students_changed', data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Отправить сообщение
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
}

export const socketService = new SocketService();