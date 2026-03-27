import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { CoursesService } from './courses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
  SubmitTestDto,
  JoinCourseDto,
} from './dto';

@Controller('courses')
@UseGuards(JwtAuthGuard)
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  async createCourse(@Request() req, @Body() dto: CreateCourseDto) {
    return await this.coursesService.createCourse(req.user.userId, dto);
  }

  @Get('my')
  async getMyCourses(@Request() req) {
    if (req.user.role === 'tutor') {
      return await this.coursesService.getTutorCourses(req.user.userId);
    } else {
      return await this.coursesService.getStudentCourses(req.user.userId);
    }
  }

  @Get(':id')
  async getCourse(@Param('id') id: string) {
    return await this.coursesService.getCourseById(+id);
  }

  @Put(':id')
  async updateCourse(@Param('id') id: string, @Request() req, @Body() dto: UpdateCourseDto) {
    return await this.coursesService.updateCourse(+id, req.user.userId, dto);
  }

  @Delete(':id')
  async deleteCourse(@Param('id') id: string, @Request() req) {
    return await this.coursesService.deleteCourse(+id, req.user.userId);
  }

  @Post(':id/invite')
  async generateInviteLink(@Param('id') id: string, @Request() req) {
    const link = await this.coursesService.generateInviteLink(+id, req.user.userId);
    return { link };
  }

  @Post('join')
  async joinCourse(@Request() req, @Body() dto: JoinCourseDto) {
    return await this.coursesService.joinCourseByToken(dto.token, req.user.userId);
  }

  @Post(':courseId/sections')
  async createSection(@Param('courseId') courseId: string, @Request() req, @Body() dto: CreateSectionDto) {
    return await this.coursesService.createSection(+courseId, req.user.userId, dto);
  }

  @Get(':courseId/sections')
  async getSections(@Param('courseId') courseId: string) {
    return await this.coursesService.getSections(+courseId);
  }

  @Put('sections/:sectionId')
  async updateSection(@Param('sectionId') sectionId: string, @Request() req, @Body() dto: UpdateSectionDto) {
    return await this.coursesService.updateSection(+sectionId, req.user.userId, dto);
  }

  @Delete('sections/:sectionId')
  async deleteSection(@Param('sectionId') sectionId: string, @Request() req) {
    return await this.coursesService.deleteSection(+sectionId, req.user.userId);
  }

  @Post('sections/:sectionId/materials')
@UseInterceptors(FileInterceptor('file', {
  storage: diskStorage({
    destination: (req, file, cb) => {
      const sectionId = req.params.sectionId;
      const uploadPath = `./uploads/courses/${sectionId}`;
      if (!existsSync(uploadPath)) {
        mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      // Правильное декодирование русских символов
      const utf8Name = Buffer.from(file.originalname, 'latin1').toString('utf8');
      cb(null, utf8Name);
    },
  }),
}))
async addMaterial(
  @Param('sectionId') sectionId: string,
  @Request() req,
  @Body() dto: CreateMaterialDto,
  @UploadedFile() file: Express.Multer.File,
) {
  if (!file) {
    throw new BadRequestException('Файл не загружен');
  }
  return await this.coursesService.addMaterial(+sectionId, req.user.userId, dto, file);
}

  @Get('sections/:sectionId/materials')
  async getMaterials(@Param('sectionId') sectionId: string) {
    return await this.coursesService.getMaterials(+sectionId);
  }

  @Delete('materials/:materialId')
  async deleteMaterial(@Param('materialId') materialId: string, @Request() req) {
    return await this.coursesService.deleteMaterial(+materialId, req.user.userId);
  }

  @Post('sections/:sectionId/homeworks')
  async createHomework(@Param('sectionId') sectionId: string, @Request() req, @Body() dto: CreateHomeworkDto) {
    return await this.coursesService.createHomework(+sectionId, req.user.userId, dto);
  }

  @Get('homeworks/:homeworkId')
  async getHomework(@Param('homeworkId') homeworkId: string) {
    return await this.coursesService.getHomework(+homeworkId);
  }

  @Put('homeworks/:homeworkId')
  async updateHomework(@Param('homeworkId') homeworkId: string, @Request() req, @Body() dto: UpdateHomeworkDto) {
    return await this.coursesService.updateHomework(+homeworkId, req.user.userId, dto);
  }

  @Delete('homeworks/:homeworkId')
  async deleteHomework(@Param('homeworkId') homeworkId: string, @Request() req) {
    return await this.coursesService.deleteHomework(+homeworkId, req.user.userId);
  }

  @Post('homeworks/submit')
@UseInterceptors(FileInterceptor('file', {
  storage: diskStorage({
    destination: (req, file, cb) => {
      const homeworkId = req.body.homework_id;
      const studentId = (req as any).user.userId;
      const uploadPath = `./uploads/homework/${homeworkId}/${studentId}`;
      if (!existsSync(uploadPath)) {
        mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const decodedName = decodeURIComponent(escape(file.originalname));
      cb(null, decodedName);
    },
  }),
}))
  async submitHomework(
    @Request() req,
    @Body() dto: SubmitHomeworkDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Файл не загружен');
    }
    return await this.coursesService.submitHomework(req.user.userId, dto, file);
  }

  @Post('submissions/:submissionId/grade')
  async gradeHomework(@Param('submissionId') submissionId: string, @Request() req, @Body() dto: GradeHomeworkDto) {
    return await this.coursesService.gradeHomework(+submissionId, req.user.userId, dto);
  }

  @Get('homeworks/:homeworkId/submissions')
  async getSubmissions(@Param('homeworkId') homeworkId: string, @Request() req) {
    return await this.coursesService.getSubmissionsForHomework(+homeworkId, req.user.userId);
  }

  @Post('sections/:sectionId/tests')
  async createTest(@Param('sectionId') sectionId: string, @Request() req, @Body() dto: CreateTestDto) {
    return await this.coursesService.createTest(+sectionId, req.user.userId, dto);
  }

  @Get('tests/:testId')
  async getTest(@Param('testId') testId: string) {
    return await this.coursesService.getTest(+testId);
  }

  @Delete('tests/:testId')
  async deleteTest(@Param('testId') testId: string, @Request() req) {
    return await this.coursesService.deleteTest(+testId, req.user.userId);
  } 

  @Post('tests/submit')
  async submitTest(@Request() req, @Body() dto: SubmitTestDto) {
    return await this.coursesService.submitTest(req.user.userId, dto);
  }

  @Get('tests/:testId/results')
  async getTestResults(@Param('testId') testId: string, @Request() req) {
    return await this.coursesService.getTestResults(+testId, req.user.userId);
  }

  @Get('tests/:testId/my-result')
  async getMyTestResult(@Param('testId') testId: string, @Request() req) {
    return await this.coursesService.getStudentTestResult(+testId, req.user.userId);
  }

  
}