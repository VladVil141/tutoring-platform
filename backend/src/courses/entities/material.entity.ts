import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Section } from './section.entity';

@Entity('materials')
export class Material {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  file_url: string;

  @Column()
  file_name: string;

  @Column()
  file_size: number;

  @Column()
  file_type: string;

  @Column()
  section_id: number;

  @ManyToOne(() => Section, section => section.materials, { onDelete: 'CASCADE' }) // 👈 добавить onDelete
  @JoinColumn({ name: 'section_id' })
  section: Section;

  @CreateDateColumn()
  created_at: Date;
}