import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToMany, CreateDateColumn } from 'typeorm';
import { Section } from './section.entity';
import { HomeworkSubmission } from './homework-submission.entity';

@Entity('homeworks')
export class Homework {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column()
  section_id: number;

  @ManyToOne(() => Section, section => section.homeworks, { onDelete: 'CASCADE' }) // 👈 добавить onDelete
  @JoinColumn({ name: 'section_id' })
  section: Section;

  @Column({ type: 'date', nullable: true })
  deadline: string | null;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => HomeworkSubmission, submission => submission.homework, { cascade: true })
  submissions: HomeworkSubmission[];
}