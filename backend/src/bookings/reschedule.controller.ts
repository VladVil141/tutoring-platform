import { Controller, Get, Post, Put, Body, Param, UseGuards, Request, ForbiddenException, BadRequestException } from '@nestjs/common';
import { RescheduleService } from './reschedule.service';
import { CreateRescheduleRequestDto } from './dto/create-reschedule-request.dto';
import { UpdateRescheduleStatusDto } from './dto/update-reschedule-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('bookings/reschedule')
export class RescheduleController {
  constructor(private readonly rescheduleService: RescheduleService) {}

  // Создать запрос на перенос
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Request() req, @Body() createDto: CreateRescheduleRequestDto) {
    return this.rescheduleService.create(req.user.userId, req.user.role, createDto);
  }

  // Получить ожидающие запросы
  @Get('pending')
  @UseGuards(JwtAuthGuard)
  async getPendingRequests(@Request() req) {
    return this.rescheduleService.getPendingRequests(req.user.userId, req.user.role);
  }

  // Подтвердить перенос
  @Put(':id/confirm')
  @UseGuards(JwtAuthGuard)
  async confirm(@Param('id') id: string, @Request() req) {
    const requestId = parseInt(id, 10);
    if (isNaN(requestId)) {
      throw new BadRequestException('Некорректный ID запроса');
    }
    return this.rescheduleService.confirm(requestId, req.user.userId, req.user.role);
  }

  // Отклонить перенос
  @Put(':id/reject')
  @UseGuards(JwtAuthGuard)
  async reject(@Param('id') id: string, @Request() req) {
    const requestId = parseInt(id, 10);
    if (isNaN(requestId)) {
      throw new BadRequestException('Некорректный ID запроса');
    }
    return this.rescheduleService.reject(requestId, req.user.userId, req.user.role);
  }
}