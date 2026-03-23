import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { GroupListing } from '../../listings/entities/group-listing.entity';

@Entity('group_chats')
export class GroupChat {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => GroupListing)
  @JoinColumn({ name: 'group_listing_id' })
  group_listing: GroupListing;

  @Column()
  group_listing_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'tutor_id' })
  tutor: User;

  @Column()
  tutor_id: number;

  @Column({ type: 'json', nullable: true })
  deleted_by: number[];

  @Column({ default: false })
  deleted_for_all: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}