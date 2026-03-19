import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request, ForbiddenException, BadRequestException } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { BookingQueryDto } from './dto/booking-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  // 1. Сначала ВСЕ конкретные пути (без :id)
  @Get('check-availability')
  async checkAvailability(
    @Query('listing_id') listingId: string,
    @Query('date') date: string,
    @Query('time') time: string,
  ) {
    const available = await this.bookingsService.checkAvailability(+listingId, date, time);
    return { available };
  }

  // 2. Потом методы с авторизацией
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Request() req, @Body() createDto: CreateBookingDto) {
    if (req.user.role !== 'student') {
      throw new ForbiddenException('Только ученики могут создавать заявки');
    }
    return this.bookingsService.create(req.user.userId, createDto);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async findMyBookings(@Request() req, @Query() query: BookingQueryDto) {
    if (req.user.role !== 'student') {
      throw new ForbiddenException('Только ученики могут просматривать свои заявки');
    }
    return this.bookingsService.findMyBookings(req.user.userId, query);
  }

  @Get('tutor')
  @UseGuards(JwtAuthGuard)
  async findTutorBookings(@Request() req, @Query() query: BookingQueryDto) {
    if (req.user.role !== 'tutor') {
      throw new ForbiddenException('Только репетиторы могут просматривать заявки');
    }
    return this.bookingsService.findTutorBookings(req.user.userId, query);
  }

  // 3. Методы с динамическими параметрами (:id) - САМЫЕ ПОСЛЕДНИЕ
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    const bookingId = parseInt(id, 10);
    if (isNaN(bookingId)) {
      throw new BadRequestException('Некорректный ID заявки');
    }
    return this.bookingsService.findOne(bookingId);
  }

  @Put(':id/confirm')
  @UseGuards(JwtAuthGuard)
  async confirm(@Param('id') id: string, @Request() req) {
    if (req.user.role !== 'tutor') {
      throw new ForbiddenException('Только репетиторы могут подтверждать заявки');
    }
    const bookingId = parseInt(id, 10);
    if (isNaN(bookingId)) {
      throw new BadRequestException('Некорректный ID заявки');
    }
    return this.bookingsService.confirm(bookingId, req.user.userId);
  }

  @Put(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancel(@Param('id') id: string, @Request() req) {
    const bookingId = parseInt(id, 10);
    if (isNaN(bookingId)) {
      throw new BadRequestException('Некорректный ID заявки');
    }
    return this.bookingsService.cancel(bookingId, req.user.userId, req.user.role);
  }

  @Put(':id/complete')
  @UseGuards(JwtAuthGuard)
  async complete(@Param('id') id: string, @Request() req) {
    if (req.user.role !== 'tutor') {
      throw new ForbiddenException('Только репетиторы могут отмечать выполнение');
    }
    const bookingId = parseInt(id, 10);
    if (isNaN(bookingId)) {
      throw new BadRequestException('Некорректный ID заявки');
    }
    return this.bookingsService.complete(bookingId, req.user.userId);
  }
}