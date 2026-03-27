import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import {
  Course,
  Section,
  Material,
  Homework,
  HomeworkSubmission,
  Test,
  TestQuestion,
  TestResult,
  CourseEnrollment
} from './entities';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Course,
      Section,
      Material,
      Homework,
      HomeworkSubmission,
      Test,
      TestQuestion,
      TestResult,
      CourseEnrollment
    ]),
    UsersModule,
  ],
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}