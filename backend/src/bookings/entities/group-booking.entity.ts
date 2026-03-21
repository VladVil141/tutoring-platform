import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { GroupListing } from '../../listings/entities/group-listing.entity';

export enum GroupBookingStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

@Entity('group_bookings')
export class GroupBooking {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column()
  student_id: number;

  @ManyToOne(() => GroupListing)
  @JoinColumn({ name: 'group_listing_id' })
  group_listing: GroupListing;

  @Column()
  group_listing_id: number;

  @Column({
    type: 'enum',
    enum: GroupBookingStatus,
    default: GroupBookingStatus.PENDING
  })
  status: GroupBookingStatus;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}