import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './gateways/chat.gateway';
import { PrivateChat } from './entities/private-chat.entity';
import { GroupChat } from './entities/group-chat.entity';
import { GroupChatMember } from './entities/group-chat-member.entity';
import { Message } from './entities/message.entity';
import { ListingsModule } from '../listings/listings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PrivateChat, GroupChat, GroupChatMember, Message]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
    forwardRef(() => ListingsModule),
  ],
  providers: [ChatService, ChatGateway],
  controllers: [ChatController],
  exports: [ChatService],
})
export class ChatModule {}