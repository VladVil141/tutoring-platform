import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Booking } from './booking.entity';

export enum RescheduleStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  REJECTED = 'rejected'
}

export enum RequestedBy {
  STUDENT = 'student',
  TUTOR = 'tutor'
}

@Entity('reschedule_requests')
export class RescheduleRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Booking)
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column()
  booking_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'requested_by_id' })
  requested_by_user: User;

  @Column()
  requested_by_id: number;

  @Column({
    type: 'enum',
    enum: RequestedBy,
    default: RequestedBy.STUDENT
  })
  requested_by: RequestedBy;

  @Column({ type: 'date' })
  new_date: string;

  @Column({ type: 'time' })
  new_time: string;

  @Column({ type: 'date' })
  old_date: string;

  @Column({ type: 'time' })
  old_time: string;

  @Column({
    type: 'enum',
    enum: RescheduleStatus,
    default: RescheduleStatus.PENDING
  })
  status: RescheduleStatus;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}