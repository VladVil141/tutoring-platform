import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { TutorProfile } from './tutor-profile.entity';

@Entity('profiles')
export class Profile {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User, user => user.profile)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @Column({ nullable: true })
  avatar_url: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ nullable: true })
  city: string;

  @Column({ type: 'date', nullable: true })
  date_of_birth: Date;

  @Column({ default: true })
  is_public: boolean;

  @OneToOne(() => TutorProfile, tutorProfile => tutorProfile.profile, { cascade: true })
  tutor_profile: TutorProfile;
}