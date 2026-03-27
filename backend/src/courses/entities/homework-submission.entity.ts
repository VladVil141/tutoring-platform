import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Homework } from './homework.entity';
import { User } from '../../users/entities/user.entity';

@Entity('homework_submissions')
export class HomeworkSubmission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  homework_id: number;

  @ManyToOne(() => Homework, homework => homework.submissions, { onDelete: 'CASCADE' }) // 👈 добавить onDelete
  @JoinColumn({ name: 'homework_id' })
  homework: Homework;

  @Column()
  student_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column()
  file_url: string;

  @Column()
  file_name: string;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ type: 'int', nullable: true })
  grade: number | null;

  @Column({ default: false })
  is_graded: boolean;

  @CreateDateColumn()
  submitted_at: Date;
}