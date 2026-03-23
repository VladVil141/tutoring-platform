import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { PrivateChat } from './entities/private-chat.entity';
import { GroupChat } from './entities/group-chat.entity';
import { GroupChatMember } from './entities/group-chat-member.entity';
import { Message, ChatType } from './entities/message.entity';
import { SendMessageDto } from './dto/send-message.dto';
import { DeleteMessageDto } from './dto/delete-message.dto';
import { CreatePrivateChatDto } from './dto/create-private-chat.dto';
import { GroupListingsService } from '../listings/group-listings.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(PrivateChat)
    private privateChatRepo: Repository<PrivateChat>,
    @InjectRepository(GroupChat)
    private groupChatRepo: Repository<GroupChat>,
    @InjectRepository(GroupChatMember)
    private groupMemberRepo: Repository<GroupChatMember>,
    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
    @Inject(forwardRef(() => GroupListingsService))
    private groupListingsService: GroupListingsService,
  ) {}


  // В классе ChatService добавь этот метод
async getMessageWithSender(messageId: number): Promise<Message> {
  const message = await this.messageRepo.findOne({
    where: { id: messageId },
    relations: ['sender', 'sender.profile'], // Загружаем отправителя и его профиль
  });
  
  if (!message) {
    throw new NotFoundException('Сообщение не найдено');
  }
  
  return message;
}

  // ==================== ЛИЧНЫЕ ЧАТЫ ====================

  // Создать или получить личный чат
  async getOrCreatePrivateChat(studentId: number, tutorId: number): Promise<PrivateChat> {
    let chat = await this.privateChatRepo.findOne({
      where: [
        { student_id: studentId, tutor_id: tutorId },
        { student_id: tutorId, tutor_id: studentId },
      ],
    });

    if (!chat) {
      chat = this.privateChatRepo.create({
        student_id: studentId,
        tutor_id: tutorId,
        deleted_by: [],
      });
      chat = await this.privateChatRepo.save(chat);
    }

    return chat;
  }

  // Получить личный чат по ID
  async getPrivateChat(chatId: number): Promise<PrivateChat> {
    const chat = await this.privateChatRepo.findOne({
      where: { id: chatId },
      relations: ['student', 'tutor', 'student.profile', 'tutor.profile'],
    });
    if (!chat) throw new NotFoundException('Чат не найден');
    return chat;
  }

  // ==================== ГРУППОВЫЕ ЧАТЫ ====================

  // Создать групповой чат при создании группового объявления
  async createGroupChat(groupListingId: number, tutorId: number): Promise<GroupChat> {
    const chat = this.groupChatRepo.create({
      group_listing_id: groupListingId,
      tutor_id: tutorId,
      deleted_by: [],
    });
    return await this.groupChatRepo.save(chat);
  }

  // Добавить ученика в групповой чат
  async addMemberToGroupChat(groupListingId: number, studentId: number): Promise<void> {
    const chat = await this.groupChatRepo.findOne({
      where: { group_listing_id: groupListingId },
    });
    if (!chat) return;

    const existing = await this.groupMemberRepo.findOne({
      where: { group_chat_id: chat.id, student_id: studentId },
    });
    if (!existing) {
      const member = this.groupMemberRepo.create({
        group_chat_id: chat.id,
        student_id: studentId,
      });
      await this.groupMemberRepo.save(member);
    }
  }

  // Удалить ученика из группового чата
  async removeMemberFromGroupChat(groupListingId: number, studentId: number): Promise<void> {
    const chat = await this.groupChatRepo.findOne({
      where: { group_listing_id: groupListingId },
    });
    if (!chat) return;

    await this.groupMemberRepo.delete({
      group_chat_id: chat.id,
      student_id: studentId,
    });
  }

  // Получить групповой чат по ID
  async getGroupChat(chatId: number): Promise<GroupChat> {
    const chat = await this.groupChatRepo.findOne({
      where: { id: chatId },
      relations: ['group_listing', 'tutor', 'tutor.profile'],
    });
    if (!chat) throw new NotFoundException('Групповой чат не найден');
    return chat;
  }

  // ==================== СООБЩЕНИЯ ====================

  // Отправить сообщение
  async sendMessage(senderId: number, dto: SendMessageDto): Promise<Message> {
    // Проверка существования чата и прав доступа
    if (dto.chat_type === ChatType.PRIVATE) {
      const chat = await this.getPrivateChat(dto.chat_id);
      if (chat.student_id !== senderId && chat.tutor_id !== senderId) {
        throw new ForbiddenException('У вас нет доступа к этому чату');
      }
    } else {
      const chat = await this.getGroupChat(dto.chat_id);
      const member = await this.groupMemberRepo.findOne({
        where: { group_chat_id: chat.id, student_id: senderId },
      });
      if (chat.tutor_id !== senderId && !member) {
        throw new ForbiddenException('У вас нет доступа к этому чату');
      }
    }

    const message = this.messageRepo.create({
      chat_type: dto.chat_type,
      chat_id: dto.chat_id,
      sender_id: senderId,
      text: dto.text,
      deleted_by: [],
    });

    return await this.messageRepo.save(message);
  }

  // Получить сообщения чата
  async getMessages(chatType: ChatType, chatId: number, userId: number, limit = 50): Promise<Message[]> {
    // Проверка доступа
    if (chatType === ChatType.PRIVATE) {
      const chat = await this.getPrivateChat(chatId);
      if (chat.student_id !== userId && chat.tutor_id !== userId) {
        throw new ForbiddenException('У вас нет доступа к этому чату');
      }
    } else {
      const chat = await this.getGroupChat(chatId);
      const member = await this.groupMemberRepo.findOne({
        where: { group_chat_id: chat.id, student_id: userId },
      });
      if (chat.tutor_id !== userId && !member) {
        throw new ForbiddenException('У вас нет доступа к этому чату');
      }
    }

    const messages = await this.messageRepo.find({
      where: { chat_type: chatType, chat_id: chatId },
      relations: ['sender', 'sender.profile'],
      order: { created_at: 'DESC' },
      take: limit,
    });

    // Фильтруем удаленные сообщения
    return messages.filter(msg => {
      if (msg.deleted_for_all) return false;
      if (msg.deleted_for_both) return false;
      if (msg.deleted_for_user_id === userId) return false;
      if (msg.deleted_by?.includes(userId)) return false;
      return true;
    }).reverse();
  }

  // Удалить сообщение
  async deleteMessage(userId: number, dto: DeleteMessageDto): Promise<Message | null> {
    const message = await this.messageRepo.findOne({
      where: { id: dto.message_id },
      relations: ['sender'],
    });
    if (!message) throw new NotFoundException('Сообщение не найдено');

    // Проверка прав (удалить может только отправитель)
    if (message.sender_id !== userId) {
      throw new ForbiddenException('Вы можете удалять только свои сообщения');
    }

    if (message.chat_type === ChatType.PRIVATE) {
      if (dto.delete_for_both) {
        message.deleted_for_both = true;
      } else {
        message.deleted_by = [...(message.deleted_by || []), userId];
      }
    } else {
      if (dto.delete_for_all) {
        message.deleted_for_all = true;
      } else if (dto.delete_for_user_id) {
        message.deleted_for_user_id = dto.delete_for_user_id;
      } else {
        message.deleted_by = [...(message.deleted_by || []), userId];
      }
    }

    return await this.messageRepo.save(message);
  }

  // Получить все чаты пользователя
  async getUserChats(userId: number): Promise<{ private: PrivateChat[]; group: GroupChat[] }> {
    const privateChats = await this.privateChatRepo.find({
      where: [
        { student_id: userId, deleted_for_both: false },
        { tutor_id: userId, deleted_for_both: false },
      ],
      relations: ['student', 'student.profile', 'tutor', 'tutor.profile'],
    });

    // Фильтруем удаленные у себя
    const filteredPrivate = privateChats.filter(chat => !chat.deleted_by?.includes(userId));

    const groupChats = await this.groupChatRepo.find({
      where: { deleted_for_all: false },
      relations: ['group_listing', 'tutor', 'tutor.profile'],
    });

    const filteredGroup: GroupChat[] = [];
    for (const chat of groupChats) {
      if (chat.deleted_by?.includes(userId)) continue;
      if (chat.tutor_id === userId) {
        filteredGroup.push(chat);
      } else {
        const member = await this.groupMemberRepo.findOne({
          where: { group_chat_id: chat.id, student_id: userId },
        });
        if (member) filteredGroup.push(chat);
      }
    }

    return { private: filteredPrivate, group: filteredGroup };
  }

  // Удалить чат у себя
  async deletePrivateChat(chatId: number, userId: number): Promise<void> {
    const chat = await this.getPrivateChat(chatId);
    if (chat.student_id !== userId && chat.tutor_id !== userId) {
      throw new ForbiddenException('У вас нет доступа к этому чату');
    }

    if (!chat.deleted_by) chat.deleted_by = [];
    chat.deleted_by.push(userId);
    await this.privateChatRepo.save(chat);
  }

  // Удалить групповой чат у себя
  async deleteGroupChat(chatId: number, userId: number): Promise<void> {
    const chat = await this.getGroupChat(chatId);
    const isMember = await this.groupMemberRepo.findOne({
      where: { group_chat_id: chat.id, student_id: userId },
    });

    if (chat.tutor_id !== userId && !isMember) {
      throw new ForbiddenException('У вас нет доступа к этому чату');
    }

    if (!chat.deleted_by) chat.deleted_by = [];
    chat.deleted_by.push(userId);
    await this.groupChatRepo.save(chat);
  }

  // Удалить групповой чат для всех (только репетитор)
  async deleteGroupChatForAll(chatId: number, tutorId: number): Promise<void> {
    const chat = await this.getGroupChat(chatId);
    if (chat.tutor_id !== tutorId) {
      throw new ForbiddenException('Только репетитор может удалить чат для всех');
    }

    chat.deleted_for_all = true;
    await this.groupChatRepo.save(chat);
  }
}