import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Test } from './test.entity';

@Entity('test_questions')
export class TestQuestion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  test_id: number;

  @ManyToOne(() => Test, test => test.questions, { onDelete: 'CASCADE' }) // 👈 добавить onDelete
  @JoinColumn({ name: 'test_id' })
  test: Test;

  @Column({ type: 'text' })
  question_text: string;

  @Column({ type: 'simple-json' })
  options: string[];

  @Column()
  correct_answer: string;

  @Column({ default: 1 })
  points: number;
}