import { Controller, Get, Put, Body, Param, Query, UseGuards, Request, ForbiddenException, BadRequestException } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { AttendanceQueryDto } from './dto/attendance-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('attendances')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // Получить все записи (для репетитора)
  @Get('tutor')
  @UseGuards(JwtAuthGuard)
  async getTutorAttendances(@Request() req, @Query() query: AttendanceQueryDto) {
    if (req.user.role !== 'tutor') {
      throw new ForbiddenException('Только репетиторы могут просматривать дневник');
    }
    return this.attendanceService.getTutorAttendances(req.user.userId, query);
  }

  // Получить одну запись
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string, @Request() req) {
    if (req.user.role !== 'tutor') {
      throw new ForbiddenException('Только репетиторы могут просматривать дневник');
    }
    const attendanceId = parseInt(id, 10);
    if (isNaN(attendanceId)) {
      throw new BadRequestException('Некорректный ID записи');
    }
    return this.attendanceService.findOne(attendanceId, req.user.userId);
  }

  // Обновить запись (посетил/оплатил/заметки)
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateAttendance(
    @Param('id') id: string,
    @Request() req,
    @Body() updateDto: UpdateAttendanceDto,
  ) {
    if (req.user.role !== 'tutor') {
      throw new ForbiddenException('Только репетиторы могут редактировать дневник');
    }
    const attendanceId = parseInt(id, 10);
    if (isNaN(attendanceId)) {
      throw new BadRequestException('Некорректный ID записи');
    }
    return this.attendanceService.updateAttendance(attendanceId, req.user.userId, updateDto);
  }
}