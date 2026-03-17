import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum ListingLevel {
  SCHOOL = 'school',
  UNIVERSITY = 'university',
  ANY = 'any'
}

export enum ListingFormat {
  ONLINE = 'online',
  OFFLINE = 'offline',
  ANY = 'any'
}

@Entity('listings')
export class Listing {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { eager: true })
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
    enum: ListingLevel,
    default: ListingLevel.ANY
  })
  level: ListingLevel;

  @Column({
    type: 'enum',
    enum: ListingFormat,
    default: ListingFormat.ANY
  })
  format: ListingFormat;

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  deleted_at: Date | null; // soft delete
}