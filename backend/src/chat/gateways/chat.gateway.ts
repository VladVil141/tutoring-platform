import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from '../chat.service';
import { SendMessageDto } from '../dto/send-message.dto';
import { DeleteMessageDto } from '../dto/delete-message.dto';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:5173',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets: Map<number, string[]> = new Map();

  constructor(
    private jwtService: JwtService,
    private chatService: ChatService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      client.data.userId = userId;

      // Сохраняем socket
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, []);
      }
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.push(client.id);
      }

      // Присоединяемся к существующим комнатам
      const chats = await this.chatService.getUserChats(userId);
      chats.private.forEach(chat => {
        client.join(`private:${chat.id}`);
      });
      chats.group.forEach(chat => {
        client.join(`group:${chat.id}`);
      });

      console.log(`User ${userId} connected`);
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId && this.userSockets.has(userId)) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        const filtered = sockets.filter(id => id !== client.id);
        if (filtered.length === 0) {
          this.userSockets.delete(userId);
        } else {
          this.userSockets.set(userId, filtered);
        }
      }
    }
    console.log(`User ${userId} disconnected`);
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SendMessageDto,
  ) {
    const userId = client.data.userId;
    
    // 👈 КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: принудительно присоединяем к комнате
    const room = `${data.chat_type}:${data.chat_id}`;
    client.join(room);
    
    // Сохраняем сообщение
    const message = await this.chatService.sendMessage(userId, data);
    
    // Загружаем полные данные сообщения с отправителем
    const fullMessage = await this.chatService.getMessageWithSender(message.id);
    
    // Отправляем всем в комнате (включая отправителя)
    this.server.to(room).emit('new_message', fullMessage);
    
    // Уведомление получателям (если нужно) - уже не обязательно, т.к. все в комнате
    if (data.chat_type === 'private') {
      const chat = await this.chatService.getPrivateChat(data.chat_id);
      const receiverId = chat.student_id === userId ? chat.tutor_id : chat.student_id;
      // Это уже избыточно, так как получатель тоже в комнате
      // Но оставляем для совместимости
      this.notifyUser(receiverId, 'new_message', fullMessage);
    }
  }

  // Удалить сообщение
  @SubscribeMessage('delete_message')
  async handleDeleteMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: DeleteMessageDto,
  ) {
    const userId = client.data.userId;
    const result = await this.chatService.deleteMessage(userId, data);

    if (result) {
      // Уведомляем участников чата об удалении
      const room = `${result.chat_type}:${result.chat_id}`;
      this.server.to(room).emit('message_deleted', {
        message_id: data.message_id,
        deleted_for_all: data.delete_for_all,
        deleted_for_user_id: data.delete_for_user_id,
      });
    }
  }

  // Уведомить конкретного пользователя
  private notifyUser(userId: number, event: string, data: any) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.forEach(socketId => {
        this.server.to(socketId).emit(event, data);
      });
    }
  }

  // Методы для внешнего вызова (из сервисов)
  notifyNewBooking(tutorId: number, booking: any) {
    this.notifyUser(tutorId, 'new_booking', booking);
  }

  notifyBookingStatusChanged(userId: number, booking: any) {
    this.notifyUser(userId, 'booking_status_changed', booking);
  }

  notifyGroupStudentsChanged(groupListingId: number, data: any) {
    this.server.to(`group:${groupListingId}`).emit('group_students_changed', data);
  }
}