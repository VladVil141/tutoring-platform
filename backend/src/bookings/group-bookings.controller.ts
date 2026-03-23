import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, ForbiddenException, BadRequestException } from '@nestjs/common';
import { GroupBookingsService } from './group-bookings.service';
import { CreateGroupBookingDto } from './dto/create-group-booking.dto';
import { GroupBookingQueryDto } from './dto/group-booking-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('group-bookings')
export class GroupBookingsController {
  constructor(private readonly groupBookingsService: GroupBookingsService) {}

  // Подать заявку в группу (ученик)
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Request() req, @Body() createDto: CreateGroupBookingDto) {
    if (req.user.role !== 'student') {
      throw new ForbiddenException('Только ученики могут подавать заявки в группы');
    }
    return this.groupBookingsService.create(req.user.userId, createDto);
  }

  // Получить мои заявки в группы (ученик)
  @Get('my')
  @UseGuards(JwtAuthGuard)
  async findMyBookings(@Request() req, @Query() query: GroupBookingQueryDto) {
    if (req.user.role !== 'student') {
      throw new ForbiddenException('Только ученики могут просматривать свои заявки');
    }
    return this.groupBookingsService.findMyBookings(req.user.userId, query.status);
  }

  // Получить заявки ко мне (репетитор)
  @Get('tutor')
  @UseGuards(JwtAuthGuard)
  async findTutorBookings(@Request() req, @Query() query: GroupBookingQueryDto) {
    if (req.user.role !== 'tutor') {
      throw new ForbiddenException('Только репетиторы могут просматривать заявки');
    }
    return this.groupBookingsService.findTutorBookings(req.user.userId, query.status);
  }

  // Получить серию занятий по группе для репетитора
  @Get('series/tutor/:groupListingId')
  @UseGuards(JwtAuthGuard)
  async getSeriesForTutor(@Param('groupListingId') groupListingId: string, @Request() req) {
    if (req.user.role !== 'tutor') {
      throw new ForbiddenException('Только репетиторы могут просматривать расписание');
    }
    const listingId = parseInt(groupListingId, 10);
    if (isNaN(listingId)) {
      throw new BadRequestException('Некорректный ID группы');
    }
    return this.groupBookingsService.getSeriesForTutor(listingId, req.user.userId);
  }

  // Получить одну заявку
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    const bookingId = parseInt(id, 10);
    if (isNaN(bookingId)) {
      throw new BadRequestException('Некорректный ID заявки');
    }
    return this.groupBookingsService.findOne(bookingId);
  }

  // Одобрить заявку (репетитор)
  @Put(':id/approve')
  @UseGuards(JwtAuthGuard)
  async approve(@Param('id') id: string, @Request() req) {
    if (req.user.role !== 'tutor') {
      throw new ForbiddenException('Только репетиторы могут одобрять заявки');
    }
    const bookingId = parseInt(id, 10);
    if (isNaN(bookingId)) {
      throw new BadRequestException('Некорректный ID заявки');
    }
    return this.groupBookingsService.approve(bookingId, req.user.userId);
  }

  // Отклонить заявку (репетитор)
  @Put(':id/reject')
  @UseGuards(JwtAuthGuard)
  async reject(@Param('id') id: string, @Request() req) {
    if (req.user.role !== 'tutor') {
      throw new ForbiddenException('Только репетиторы могут отклонять заявки');
    }
    const bookingId = parseInt(id, 10);
    if (isNaN(bookingId)) {
      throw new BadRequestException('Некорректный ID заявки');
    }
    return this.groupBookingsService.reject(bookingId, req.user.userId);
  }

  // Отменить свою заявку (ученик)
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async cancel(@Param('id') id: string, @Request() req) {
    if (req.user.role !== 'student') {
      throw new ForbiddenException('Только ученики могут отменять свои заявки');
    }
    const bookingId = parseInt(id, 10);
    if (isNaN(bookingId)) {
      throw new BadRequestException('Некорректный ID заявки');
    }
    await this.groupBookingsService.cancel(bookingId, req.user.userId);
    return { message: 'Заявка отменена' };
  }

  // Выйти из группы (ученик)
  @Delete('group/:groupListingId/leave')
  @UseGuards(JwtAuthGuard)
  async leaveGroup(@Param('groupListingId') groupListingId: string, @Request() req) {
    if (req.user.role !== 'student') {
      throw new ForbiddenException('Только ученики могут выходить из групп');
    }
    const listingId = parseInt(groupListingId, 10);
    if (isNaN(listingId)) {
      throw new BadRequestException('Некорректный ID группы');
    }
    await this.groupBookingsService.leaveGroup(listingId, req.user.userId);
    return { message: 'Вы вышли из группы' };
  }
}