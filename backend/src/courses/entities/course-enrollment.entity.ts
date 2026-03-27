import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Course } from './course.entity';
import { User } from '../../users/entities/user.entity';

@Entity('course_enrollments')
export class CourseEnrollment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  course_id: number;

  @ManyToOne(() => Course, course => course.enrollments)
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column()
  student_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  enrolled_at: Date;

  @Column({ type: 'datetime', nullable: true })
  completed_at: Date | null;
}