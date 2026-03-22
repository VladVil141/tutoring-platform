import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Listing } from '../../listings/entities/listing.entity';

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed'
}

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column()
  student_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'tutor_id' })
  tutor: User;

  @Column()
  tutor_id: number;

  @ManyToOne(() => Listing)
  @JoinColumn({ name: 'listing_id' })
  listing: Listing;

  @Column({ nullable: true })  // 👈 делаем nullable
  listing_id: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'time' })
  time: string;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING
  })
  status: BookingStatus;

  // Поля для регулярных занятий
  @Column({ nullable: true })
  recurring_id: string;

  @Column({ nullable: true })
  recurring_pattern: string;

  @Column({ nullable: true, type: 'date' })
  recurring_end: string;

  @Column({ nullable: true })
  parent_booking_id: number;

  @Column({ nullable: true })
  group_booking_id: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}