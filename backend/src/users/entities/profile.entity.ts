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

  @Column({ default: '' })
  first_name: string;

  @Column({ default: '' })
  last_name: string;

  @Column({ nullable: true, type: 'varchar' })
  avatar_url: string | null;

  @Column({ nullable: true, type: 'varchar' })
  phone: string | null;

  @Column({ nullable: true, type: 'text' })
  bio: string | null;

  @Column({ nullable: true, type: 'varchar' })
  city: string | null;

  @Column({ nullable: true, type: 'date' })
  date_of_birth: Date | null;

  @OneToOne(() => TutorProfile, tutorProfile => tutorProfile.profile, { cascade: true })
  tutor_profile: TutorProfile;
}