import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Test } from './test.entity';
import { User } from '../../users/entities/user.entity';

@Entity('test_results')
export class TestResult {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  test_id: number;

  @ManyToOne(() => Test, test => test.results, { onDelete: 'CASCADE' }) // 👈 добавить onDelete
  @JoinColumn({ name: 'test_id' })
  test: Test;

  @Column()
  student_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column({ type: 'simple-json' })
  answers: Record<string, string>;

  @Column({ type: 'int' })
  score: number;

  @Column({ type: 'int' })
  max_score: number;

  @CreateDateColumn()
  completed_at: Date;
}