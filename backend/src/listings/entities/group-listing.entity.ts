import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum GroupListingLevel {
  SCHOOL = 'school',
  UNIVERSITY = 'university',
  ANY = 'any'
}

export enum GroupListingFormat {
  ONLINE = 'online',
  OFFLINE = 'offline',
  ANY = 'any'
}

@Entity('group_listings')
export class GroupListing {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'tutor_id' })
  tutor: User;

  @Column()
  tutor_id: number;

  @Column()
  subject: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column('text')
  description: string;

  @Column({
    type: 'enum',
    enum: GroupListingLevel,
    default: GroupListingLevel.ANY
  })
  level: GroupListingLevel;

  @Column({
    type: 'enum',
    enum: GroupListingFormat,
    default: GroupListingFormat.ANY
  })
  format: GroupListingFormat;

  @Column()
  schedule: string; // например: "Пн/Ср 18:00"

  @Column()
  min_students: number;

  @Column()
  max_students: number;

  @Column({ default: 0 })
  current_students: number;

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  deleted_at: Date | null;
}