import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToMany, CreateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Section } from './section.entity';
import { CourseEnrollment } from './course-enrollment.entity';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column()
  tutor_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'tutor_id' })
  tutor: User;

  @Column({ nullable: true })
  invite_token: string;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => Section, section => section.course, { cascade: true })
  sections: Section[];

  @OneToMany(() => CourseEnrollment, enrollment => enrollment.course)
  enrollments: CourseEnrollment[];
}