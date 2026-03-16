import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn } from 'typeorm';
import { Profile } from './profile.entity';

@Entity('tutor_profiles')
export class TutorProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Profile, profile => profile.tutor_profile)
  @JoinColumn({ name: 'profile_id' })
  profile: Profile;

  @Column({ nullable: true, type: 'text' })
  education: string | null;

  @Column({ nullable: true, type: 'text' })
  experience: string | null;

  @Column({ nullable: true, type: 'text' })
  subjects: string | null;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  hourly_rate: number | null;

  @Column({ default: false })
  is_verified: boolean;
}