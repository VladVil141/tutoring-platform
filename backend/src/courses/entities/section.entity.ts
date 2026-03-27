import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Course } from './course.entity';
import { Material } from './material.entity';
import { Homework } from './homework.entity';
import { Test } from './test.entity';

export enum SectionType {
  MATERIALS = 'materials',
  HOMEWORK = 'homework',
  TEST = 'test'
}

@Entity('sections')
export class Section {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'enum', enum: SectionType, default: SectionType.MATERIALS })
  type: SectionType;

  @Column()
  course_id: number;

  @ManyToOne(() => Course, course => course.sections)
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column({ default: 0 })
  order: number;

  @OneToMany(() => Material, material => material.section, { cascade: true })
  materials: Material[];

  @OneToMany(() => Homework, homework => homework.section, { cascade: true })
  homeworks: Homework[];

  @OneToMany(() => Test, test => test.section, { cascade: true })
  tests: Test[];
}