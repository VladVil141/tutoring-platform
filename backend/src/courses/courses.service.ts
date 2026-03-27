import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  Course,
  Section,
  Material,
  Homework,
  HomeworkSubmission,
  Test,
  TestQuestion,
  TestResult,
  CourseEnrollment,
  SectionType
} from './entities';
import {
  CreateCourseDto,
  UpdateCourseDto,
  CreateSectionDto,
  UpdateSectionDto,
  CreateMaterialDto,
  CreateHomeworkDto,
  UpdateHomeworkDto,
  SubmitHomeworkDto,
  GradeHomeworkDto,
  CreateTestDto,
  SubmitTestDto
} from './dto';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(Section)
    private sectionRepository: Repository<Section>,
    @InjectRepository(Material)
    private materialRepository: Repository<Material>,
    @InjectRepository(Homework)
    private homeworkRepository: Repository<Homework>,
    @InjectRepository(HomeworkSubmission)
    private homeworkSubmissionRepository: Repository<HomeworkSubmission>,
    @InjectRepository(Test)
    private testRepository: Repository<Test>,
    @InjectRepository(TestQuestion)
    private testQuestionRepository: Repository<TestQuestion>,
    @InjectRepository(TestResult)
    private testResultRepository: Repository<TestResult>,
    @InjectRepository(CourseEnrollment)
    private enrollmentRepository: Repository<CourseEnrollment>,
  ) {}

  async createCourse(tutorId: number, dto: CreateCourseDto): Promise<Course> {
    const course = this.courseRepository.create({
      ...dto,
      tutor_id: tutorId,
      invite_token: uuidv4(),
    });
    return await this.courseRepository.save(course);
  }

  async getTutorCourses(tutorId: number): Promise<Course[]> {
    return await this.courseRepository.find({
      where: { tutor_id: tutorId },
      relations: ['sections', 'enrollments', 'enrollments.student', 'enrollments.student.profile'],
      order: { created_at: 'DESC' },
    });
  }

  async getStudentCourses(studentId: number): Promise<CourseEnrollment[]> {
    return await this.enrollmentRepository.find({
      where: { student_id: studentId, is_active: true },
      relations: ['course', 'course.tutor', 'course.tutor.profile', 'course.sections'],
      order: { enrolled_at: 'DESC' },
    });
  }

  async getCourseById(courseId: number): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: [
        'tutor', 'tutor.profile',
        'sections',
        'sections.materials',
        'sections.homeworks',
        'sections.homeworks.submissions',
        'sections.homeworks.submissions.student',
        'sections.homeworks.submissions.student.profile',
        'sections.tests',
        'sections.tests.questions',
        'sections.tests.results',
        'enrollments',
        'enrollments.student',
        'enrollments.student.profile'
      ],
      order: { sections: { order: 'ASC' } }
    });

    if (!course) {
      throw new NotFoundException('Курс не найден');
    }

    return course;
  }

  async updateCourse(courseId: number, tutorId: number, dto: UpdateCourseDto): Promise<Course> {
    const course = await this.getCourseById(courseId);
    if (course.tutor_id !== tutorId) {
      throw new ForbiddenException('Вы можете редактировать только свои курсы');
    }

    Object.assign(course, dto);
    return await this.courseRepository.save(course);
  }

  async deleteCourse(courseId: number, tutorId: number): Promise<void> {
    const course = await this.getCourseById(courseId);
    if (course.tutor_id !== tutorId) {
      throw new ForbiddenException('Вы можете удалять только свои курсы');
    }
    await this.courseRepository.delete(courseId);
  }

  async generateInviteLink(courseId: number, tutorId: number): Promise<string> {
    const course = await this.getCourseById(courseId);
    if (course.tutor_id !== tutorId) {
      throw new ForbiddenException('Вы можете генерировать ссылки только для своих курсов');
    }
    const newToken = uuidv4();
    await this.courseRepository.update(courseId, { invite_token: newToken });
    return `${process.env.FRONTEND_URL || 'http://localhost:5173'}/courses/join/${newToken}`;
  }

  async joinCourseByToken(token: string, studentId: number): Promise<CourseEnrollment> {
    const course = await this.courseRepository.findOne({
      where: { invite_token: token, is_active: true },
    });

    if (!course) {
      throw new NotFoundException('Неверная ссылка или курс неактивен');
    }

    const existing = await this.enrollmentRepository.findOne({
      where: { course_id: course.id, student_id: studentId },
    });

    if (existing) {
      throw new BadRequestException('Вы уже записаны на этот курс');
    }

    const enrollment = this.enrollmentRepository.create({
      course_id: course.id,
      student_id: studentId,
    });

    return await this.enrollmentRepository.save(enrollment);
  }

  async createSection(courseId: number, tutorId: number, dto: CreateSectionDto): Promise<Section> {
    const course = await this.getCourseById(courseId);
    if (course.tutor_id !== tutorId) {
      throw new ForbiddenException('Вы можете добавлять секции только в свои курсы');
    }

    const sectionsCount = await this.sectionRepository.count({ where: { course_id: courseId } });
    const section = this.sectionRepository.create({
      ...dto,
      course_id: courseId,
      order: dto.order ?? sectionsCount,
    });

    return await this.sectionRepository.save(section);
  }

  async getSections(courseId: number): Promise<Section[]> {
    return await this.sectionRepository.find({
      where: { course_id: courseId },
      relations: ['materials', 'homeworks', 'tests', 'tests.questions'],
      order: { order: 'ASC' },
    });
  }

  async updateSection(sectionId: number, tutorId: number, dto: UpdateSectionDto): Promise<Section> {
    const section = await this.sectionRepository.findOne({
      where: { id: sectionId },
      relations: ['course'],
    });

    if (!section) {
      throw new NotFoundException('Секция не найдена');
    }
    if (section.course.tutor_id !== tutorId) {
      throw new ForbiddenException('Вы можете редактировать только свои курсы');
    }

    Object.assign(section, dto);
    return await this.sectionRepository.save(section);
  }

  async deleteSection(sectionId: number, tutorId: number): Promise<void> {
    const section = await this.sectionRepository.findOne({
      where: { id: sectionId },
      relations: ['course'],
    });

    if (!section) {
      throw new NotFoundException('Секция не найдена');
    }
    if (section.course.tutor_id !== tutorId) {
      throw new ForbiddenException('Вы можете удалять только свои курсы');
    }

    await this.sectionRepository.delete(sectionId);
  }

  async addMaterial(sectionId: number, tutorId: number, dto: CreateMaterialDto, file: Express.Multer.File): Promise<Material> {
  const section = await this.sectionRepository.findOne({
    where: { id: sectionId },
    relations: ['course'],
  });

  if (!section) {
    throw new NotFoundException('Секция не найдена');
  }
  if (section.course.tutor_id !== tutorId) {
    throw new ForbiddenException('Вы можете добавлять материалы только в свои курсы');
  }
  if (section.type !== SectionType.MATERIALS) {
    throw new BadRequestException('Эта секция не предназначена для учебных материалов');
  }

  // 👈 КОДИРУЕМ URL
  const encodedFileName = encodeURIComponent(file.originalname);
  const fileUrl = `/uploads/courses/${sectionId}/${encodedFileName}`;

  const material = this.materialRepository.create({
    title: dto.title || file.originalname,
    section_id: sectionId,
    file_url: fileUrl,
    file_name: file.originalname,
    file_size: file.size,
    file_type: file.mimetype,
  });

  return await this.materialRepository.save(material);
}

  async getMaterials(sectionId: number): Promise<Material[]> {
    return await this.materialRepository.find({
      where: { section_id: sectionId },
      order: { created_at: 'ASC' },
    });
  }

  async deleteMaterial(materialId: number, tutorId: number): Promise<void> {
    const material = await this.materialRepository.findOne({
      where: { id: materialId },
      relations: ['section', 'section.course'],
    });

    if (!material) {
      throw new NotFoundException('Материал не найден');
    }
    if (material.section.course.tutor_id !== tutorId) {
      throw new ForbiddenException('Вы можете удалять только свои материалы');
    }

    await this.materialRepository.delete(materialId);
  }

  async createHomework(sectionId: number, tutorId: number, dto: CreateHomeworkDto): Promise<Homework> {
    const section = await this.sectionRepository.findOne({
      where: { id: sectionId },
      relations: ['course'],
    });

    if (!section) {
      throw new NotFoundException('Секция не найдена');
    }
    if (section.course.tutor_id !== tutorId) {
      throw new ForbiddenException('Вы можете создавать задания только в своих курсах');
    }
    if (section.type !== SectionType.HOMEWORK) {
      throw new BadRequestException('Эта секция не предназначена для домашних заданий');
    }

    const homework = this.homeworkRepository.create({
      ...dto,
      section_id: sectionId,
    });

    return await this.homeworkRepository.save(homework);
  }

  async getHomework(homeworkId: number): Promise<Homework> {
    const homework = await this.homeworkRepository.findOne({
      where: { id: homeworkId },
      relations: ['section', 'section.course', 'submissions', 'submissions.student', 'submissions.student.profile'],
    });

    if (!homework) {
      throw new NotFoundException('Домашнее задание не найдено');
    }

    return homework;
  }

  async updateHomework(homeworkId: number, tutorId: number, dto: UpdateHomeworkDto): Promise<Homework> {
    const homework = await this.homeworkRepository.findOne({
      where: { id: homeworkId },
      relations: ['section', 'section.course'],
    });

    if (!homework) {
      throw new NotFoundException('Домашнее задание не найдено');
    }
    if (homework.section.course.tutor_id !== tutorId) {
      throw new ForbiddenException('Вы можете редактировать только свои задания');
    }

    Object.assign(homework, dto);
    return await this.homeworkRepository.save(homework);
  }

  async deleteHomework(homeworkId: number, tutorId: number): Promise<void> {
    const homework = await this.homeworkRepository.findOne({
      where: { id: homeworkId },
      relations: ['section', 'section.course'],
    });

    if (!homework) {
      throw new NotFoundException('Домашнее задание не найдено');
    }
    if (homework.section.course.tutor_id !== tutorId) {
      throw new ForbiddenException('Вы можете удалять только свои задания');
    }

    await this.homeworkRepository.delete(homeworkId);
  }

  async submitHomework(studentId: number, dto: SubmitHomeworkDto, file: Express.Multer.File): Promise<HomeworkSubmission> {
    const homework = await this.homeworkRepository.findOne({
      where: { id: dto.homework_id },
      relations: ['section', 'section.course'],
    });

    if (!homework) {
      throw new NotFoundException('Домашнее задание не найдено');
    }

    const enrollment = await this.enrollmentRepository.findOne({
      where: { course_id: homework.section.course_id, student_id: studentId },
    });

    if (!enrollment) {
      throw new ForbiddenException('Вы не записаны на этот курс');
    }

    if (homework.deadline && new Date(homework.deadline) < new Date()) {
      throw new BadRequestException('Дедлайн сдачи задания истек');
    }

    const fileUrl = `/uploads/homework/${dto.homework_id}/${studentId}/${file.originalname}`;

    const submission = this.homeworkSubmissionRepository.create({
      homework_id: dto.homework_id,
      student_id: studentId,
      file_url: fileUrl,
      file_name: file.originalname,
      comment: dto.comment || null,
    });

    return await this.homeworkSubmissionRepository.save(submission);
  }

  async gradeHomework(submissionId: number, tutorId: number, dto: GradeHomeworkDto): Promise<HomeworkSubmission> {
    const submission = await this.homeworkSubmissionRepository.findOne({
      where: { id: submissionId },
      relations: ['homework', 'homework.section', 'homework.section.course'],
    });

    if (!submission) {
      throw new NotFoundException('Работа не найдена');
    }
    if (submission.homework.section.course.tutor_id !== tutorId) {
      throw new ForbiddenException('Вы можете оценивать только работы своих учеников');
    }

    submission.grade = dto.grade;
    submission.comment = dto.comment || null;
    submission.is_graded = true;

    return await this.homeworkSubmissionRepository.save(submission);
  }

  async getSubmissionsForHomework(homeworkId: number, tutorId: number): Promise<HomeworkSubmission[]> {
    const homework = await this.homeworkRepository.findOne({
      where: { id: homeworkId },
      relations: ['section', 'section.course'],
    });

    if (!homework) {
      throw new NotFoundException('Домашнее задание не найдено');
    }
    if (homework.section.course.tutor_id !== tutorId) {
      throw new ForbiddenException('Вы можете просматривать только работы своих учеников');
    }

    return await this.homeworkSubmissionRepository.find({
      where: { homework_id: homeworkId },
      relations: ['student', 'student.profile'],
      order: { submitted_at: 'DESC' },
    });
  }

  async createTest(sectionId: number, tutorId: number, dto: CreateTestDto): Promise<Test> {
    const section = await this.sectionRepository.findOne({
      where: { id: sectionId },
      relations: ['course'],
    });

    if (!section) {
      throw new NotFoundException('Секция не найдена');
    }
    if (section.course.tutor_id !== tutorId) {
      throw new ForbiddenException('Вы можете создавать тесты только в своих курсах');
    }
    if (section.type !== SectionType.TEST) {
      throw new BadRequestException('Эта секция не предназначена для тестов');
    }

    const test = this.testRepository.create({
      title: dto.title,
      description: dto.description,
      section_id: sectionId,
    });

    const savedTest = await this.testRepository.save(test);

    const questions = dto.questions.map(q => this.testQuestionRepository.create({
      ...q,
      test_id: savedTest.id,
    }));

    await this.testQuestionRepository.save(questions);
    savedTest.questions = questions;

    return savedTest;
  }

  async getTest(testId: number): Promise<Test> {
    const test = await this.testRepository.findOne({
      where: { id: testId },
      relations: ['section', 'section.course', 'questions'],
    });

    if (!test) {
      throw new NotFoundException('Тест не найдена');
    }

    return test;
  }

  async deleteTest(testId: number, tutorId: number): Promise<void> {
  const test = await this.testRepository.findOne({
    where: { id: testId },
    relations: ['section', 'section.course'],
  });

  if (!test) {
    throw new NotFoundException('Тест не найден');
  }
  if (test.section.course.tutor_id !== tutorId) {
    throw new ForbiddenException('Вы можете удалять только свои тесты');
  }

  await this.testRepository.delete(testId);
}

  async submitTest(studentId: number, dto: SubmitTestDto): Promise<TestResult> {
    const test = await this.testRepository.findOne({
      where: { id: dto.test_id },
      relations: ['questions', 'section', 'section.course'],
    });

    if (!test) {
      throw new NotFoundException('Тест не найден');
    }

    const enrollment = await this.enrollmentRepository.findOne({
      where: { course_id: test.section.course_id, student_id: studentId },
    });

    if (!enrollment) {
      throw new ForbiddenException('Вы не записаны на этот курс');
    }

    const existing = await this.testResultRepository.findOne({
      where: { test_id: dto.test_id, student_id: studentId },
    });

    if (existing) {
      throw new BadRequestException('Вы уже прошли этот тест');
    }

    let score = 0;
    let maxScore = 0;

    for (const question of test.questions) {
      maxScore += question.points;
      const userAnswer = dto.answers[question.id];
      if (userAnswer === question.correct_answer) {
        score += question.points;
      }
    }

    const result = this.testResultRepository.create({
      test_id: dto.test_id,
      student_id: studentId,
      answers: dto.answers,
      score,
      max_score: maxScore,
    });

    return await this.testResultRepository.save(result);
  }

  async getTestResults(testId: number, tutorId: number): Promise<TestResult[]> {
    const test = await this.testRepository.findOne({
      where: { id: testId },
      relations: ['section', 'section.course'],
    });

    if (!test) {
      throw new NotFoundException('Тест не найден');
    }
    if (test.section.course.tutor_id !== tutorId) {
      throw new ForbiddenException('Вы можете просматривать только результаты своих тестов');
    }

    return await this.testResultRepository.find({
      where: { test_id: testId },
      relations: ['student', 'student.profile'],
      order: { completed_at: 'DESC' },
    });
  }

  async getStudentTestResult(testId: number, studentId: number): Promise<TestResult | null> {
    return await this.testResultRepository.findOne({
      where: { test_id: testId, student_id: studentId },
    });
  }
}