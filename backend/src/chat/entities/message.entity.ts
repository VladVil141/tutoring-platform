import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum ChatType {
  PRIVATE = 'private',
  GROUP = 'group'
}

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: ChatType })
  chat_type: ChatType;

  @Column()
  chat_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @Column()
  sender_id: number;

  @Column('text')
  text: string;

  @Column({ default: false })
  is_read: boolean;

  @Column({ type: 'json', nullable: true })
  deleted_by: number[];

  @Column({ default: false })
  deleted_for_both: boolean;

  @Column({ default: false })
  deleted_for_all: boolean;

  @Column({ nullable: true })
  deleted_for_user_id: number;

  @CreateDateColumn()
  created_at: Date;
}