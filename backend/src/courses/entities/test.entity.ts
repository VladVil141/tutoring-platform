import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToMany, CreateDateColumn } from 'typeorm';
import { Section } from './section.entity';
import { TestQuestion } from './test-question.entity';
import { TestResult } from './test-result.entity';

@Entity('tests')
export class Test {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column()
  section_id: number;

  @ManyToOne(() => Section, section => section.tests, { onDelete: 'CASCADE' }) // 👈 добавить onDelete
  @JoinColumn({ name: 'section_id' })
  section: Section;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => TestQuestion, question => question.test, { cascade: true })
  questions: TestQuestion[];

  @OneToMany(() => TestResult, result => result.test, { cascade: true })
  results: TestResult[];
}