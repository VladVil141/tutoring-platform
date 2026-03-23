import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreatePrivateChatDto } from './dto/create-private-chat.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { DeleteMessageDto } from './dto/delete-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatType } from './entities/message.entity';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // Получить все чаты пользователя
  @Get('chats')
  async getUserChats(@Request() req) {
    return this.chatService.getUserChats(req.user.userId);
  }

  // Создать или получить личный чат с репетитором/учеником
  @Post('private')
  async createPrivateChat(@Request() req, @Body() dto: CreatePrivateChatDto) {
    return this.chatService.getOrCreatePrivateChat(req.user.userId, dto.tutor_id);
  }

  // Получить сообщения чата
  @Get(':type/:chatId/messages')
  async getMessages(
    @Param('type') type: string,
    @Param('chatId') chatId: string,
    @Request() req,
    @Query('limit') limit?: string,
  ) {
    if (type !== 'private' && type !== 'group') {
      throw new ForbiddenException('Неверный тип чата');
    }
    return this.chatService.getMessages(
      type as ChatType,
      parseInt(chatId),
      req.user.userId,
      limit ? parseInt(limit) : 50,
    );
  }

  // Удалить личный чат у себя
  @Delete('private/:chatId')
  async deletePrivateChat(@Param('chatId') chatId: string, @Request() req) {
    await this.chatService.deletePrivateChat(parseInt(chatId), req.user.userId);
    return { message: 'Чат удален' };
  }

  // Удалить групповой чат у себя
  @Delete('group/:chatId')
  async deleteGroupChat(@Param('chatId') chatId: string, @Request() req) {
    await this.chatService.deleteGroupChat(parseInt(chatId), req.user.userId);
    return { message: 'Чат удален' };
  }

  // Удалить групповой чат для всех (только репетитор)
  @Delete('group/:chatId/all')
  async deleteGroupChatForAll(@Param('chatId') chatId: string, @Request() req) {
    if (req.user.role !== 'tutor') {
      throw new ForbiddenException('Только репетитор может удалить чат для всех');
    }
    await this.chatService.deleteGroupChatForAll(parseInt(chatId), req.user.userId);
    return { message: 'Чат удален для всех' };
  }
}