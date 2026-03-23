import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { GroupChat } from './group-chat.entity';

@Entity('group_chat_members')
export class GroupChatMember {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => GroupChat)
  @JoinColumn({ name: 'group_chat_id' })
  group_chat: GroupChat;

  @Column()
  group_chat_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column()
  student_id: number;

  @CreateDateColumn()
  joined_at: Date;
}