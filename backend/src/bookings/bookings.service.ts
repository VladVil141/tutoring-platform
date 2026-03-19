import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Booking, BookingStatus } from './entities/booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateRecurringBookingDto } from './dto/create-recurring-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { BookingQueryDto } from './dto/booking-query.dto';
import { ListingsService } from '../listings/listings.service';
import { UsersService } from '../users/users.service';
import * as crypto from 'crypto';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    private listingsService: ListingsService,
    private usersService: UsersService,
  ) {}

  // Вспомогательная функция для генерации дат по дням недели
  private generateDatesFromWeekdays(startDate: string, weekdays: string[], weeks: number): string[] {
    const dates: string[] = [];
    const start = new Date(startDate);
  
    // Маппинг дней недели
    const dayMap: Record<string, number> = {
      'ВС': 0, 'ПН': 1, 'ВТ': 2, 'СР': 3, 'ЧТ': 4, 'ПТ': 5, 'СБ': 6
    };
  
    const targetDays = weekdays.map(d => dayMap[d]);
    const startDay = start.getDay(); // 0 = ВС, 1 = ПН, ...
  
    // Находим первый подходящий день
    let firstDate = new Date(start);
    let daysToAdd = 0;
  
    // Ищем ближайший выбранный день недели
    while (!targetDays.includes((startDay + daysToAdd) % 7) && daysToAdd < 7) {
      daysToAdd++;
    }
  
    if (daysToAdd > 0) {
      firstDate.setDate(start.getDate() + daysToAdd);
    }
  
    // Генерируем даты
    for (let week = 0; week < weeks; week++) {
      for (const targetDay of targetDays) {
        const currentDate = new Date(firstDate);
        currentDate.setDate(firstDate.getDate() + (targetDay - firstDate.getDay() + 7) % 7 + week * 7);
        dates.push(currentDate.toISOString().split('T')[0]);
      }
    }
  
    return dates.sort();
  }

  // Создать разовую заявку
  async create(studentId: number, createDto: CreateBookingDto): Promise<Booking> {
    const listing = await this.listingsService.findOne(createDto.listing_id);
    
    if (listing.tutor_id === studentId) {
      throw new ForbiddenException('Нельзя записаться к самому себе');
    }

    const existingBooking = await this.bookingRepository.findOne({
      where: {
        tutor_id: listing.tutor_id,
        date: createDto.date,
        time: createDto.time,
        status: In([BookingStatus.PENDING, BookingStatus.CONFIRMED])
      }
    });

    if (existingBooking) {
      throw new BadRequestException('Это время уже занято');
    }

    const booking = this.bookingRepository.create({
      student_id: studentId,
      tutor_id: listing.tutor_id,
      listing_id: createDto.listing_id,
      date: createDto.date,
      time: createDto.time,
      status: BookingStatus.PENDING,
    });

    return await this.bookingRepository.save(booking);
  }

  // Создать регулярные занятия
  async createRecurring(studentId: number, createDto: CreateRecurringBookingDto): Promise<Booking[]> {
  const listing = await this.listingsService.findOne(createDto.listing_id);
  
  if (listing.tutor_id === studentId) {
    throw new ForbiddenException('Нельзя записаться к самому себе');
  }

  // Генерируем даты начиная со следующей недели
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 7); // +7 дней
  
  const dates = this.generateDatesFromWeekdays(
    startDate.toISOString().split('T')[0],
    createDto.weekdays,
    createDto.weeks
  );

  const recurringId = crypto.randomUUID();
  const createdBookings: Booking[] = [];

  // Проверяем каждую дату на доступность
  for (const date of dates) {
    const existing = await this.bookingRepository.findOne({
      where: {
        tutor_id: listing.tutor_id,
        date,
        time: createDto.time,
        status: In([BookingStatus.PENDING, BookingStatus.CONFIRMED])
      }
    });

    if (existing) {
      throw new BadRequestException(`Дата ${date} уже занята`);
    }
  }

  // Создаем все занятия серии
  for (const date of dates) {
    const booking = this.bookingRepository.create({
      student_id: studentId,
      tutor_id: listing.tutor_id,
      listing_id: createDto.listing_id,
      date,
      time: createDto.time,
      status: BookingStatus.PENDING,
      recurring_id: recurringId,
      recurring_pattern: createDto.weekdays.join(','),
      recurring_end: dates[dates.length - 1]
    });

    const saved = await this.bookingRepository.save(booking);
    createdBookings.push(saved);
  }

  return createdBookings;
}

  // Получить мои заявки (для ученика)
  async findMyBookings(studentId: number, query: BookingQueryDto): Promise<Booking[]> {
    const where: any = { student_id: studentId };

    if (query.status) {
      where.status = query.status;
    }

    if (query.start_date && query.end_date) {
      where.date = Between(query.start_date, query.end_date);
    }

    return await this.bookingRepository.find({
      where,
      relations: ['listing', 'listing.tutor', 'listing.tutor.profile'],
      order: { date: 'ASC', time: 'ASC' },
    });
  }

  // Получить заявки ко мне (для репетитора)
  async findTutorBookings(tutorId: number, query: BookingQueryDto): Promise<Booking[]> {
    const where: any = { tutor_id: tutorId };

    if (query.status) {
      where.status = query.status;
    }

    if (query.start_date && query.end_date) {
      where.date = Between(query.start_date, query.end_date);
    }

    return await this.bookingRepository.find({
      where,
      relations: ['student', 'student.profile', 'listing'],
      order: { date: 'ASC', time: 'ASC' },
    });
  }

  // Получить одну заявку
  async findOne(id: number): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: ['student', 'student.profile', 'listing', 'listing.tutor', 'listing.tutor.profile'],
    });

    if (!booking) {
      throw new NotFoundException('Заявка не найдена');
    }

    return booking;
  }

  // Получить серию занятий
  async findRecurring(recurringId: string): Promise<Booking[]> {
    return await this.bookingRepository.find({
      where: { recurring_id: recurringId },
      relations: ['student', 'student.profile', 'listing', 'listing.tutor'],
      order: { date: 'ASC' }
    });
  }

  // Подтвердить заявку (репетитор)
  async confirm(id: number, tutorId: number): Promise<Booking> {
    const booking = await this.findOne(id);

    if (booking.tutor_id !== tutorId) {
      throw new ForbiddenException('Вы можете подтверждать только свои заявки');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Можно подтвердить только ожидающие заявки');
    }

    booking.status = BookingStatus.CONFIRMED;
    return await this.bookingRepository.save(booking);
  }

  // Отменить заявку (ученик или репетитор)
  async cancel(id: number, userId: number, role: string): Promise<Booking> {
    const booking = await this.findOne(id);

    if (role === 'student' && booking.student_id !== userId) {
      throw new ForbiddenException('Вы можете отменять только свои заявки');
    }
    if (role === 'tutor' && booking.tutor_id !== userId) {
      throw new ForbiddenException('Вы можете отменять только свои заявки');
    }

    if (booking.status === BookingStatus.COMPLETED) {
      throw new BadRequestException('Нельзя отменить завершенное занятие');
    }

    booking.status = BookingStatus.CANCELLED;
    return await this.bookingRepository.save(booking);
  }

  // Отменить всю серию
  async cancelRecurring(recurringId: string, userId: number, role: string): Promise<void> {
    const bookings = await this.bookingRepository.find({
      where: { recurring_id: recurringId }
    });

    if (bookings.length === 0) {
      throw new NotFoundException('Серия не найдена');
    }

    // Проверка прав
    for (const booking of bookings) {
      if (role === 'student' && booking.student_id !== userId) {
        throw new ForbiddenException('Вы можете отменять только свои заявки');
      }
      if (role === 'tutor' && booking.tutor_id !== userId) {
        throw new ForbiddenException('Вы можете отменять только свои заявки');
      }
    }

    // Отменяем все будущие занятия
    const today = new Date().toISOString().split('T')[0];
    
    for (const booking of bookings) {
      if (booking.date >= today && booking.status !== BookingStatus.COMPLETED) {
        booking.status = BookingStatus.CANCELLED;
        await this.bookingRepository.save(booking);
      }
    }
  }

  // Отметить как выполненное (репетитор)
  async complete(id: number, tutorId: number): Promise<Booking> {
    const booking = await this.findOne(id);

    if (booking.tutor_id !== tutorId) {
      throw new ForbiddenException('Только репетитор может отметить выполнение');
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Можно завершить только подтвержденные занятия');
    }

    booking.status = BookingStatus.COMPLETED;
    return await this.bookingRepository.save(booking);
  }

  // Проверить доступность времени
  async checkAvailability(listingId: number, date: string, time: string): Promise<boolean> {
    const listing = await this.listingsService.findOne(listingId);
    
    const existing = await this.bookingRepository.findOne({
      where: {
        tutor_id: listing.tutor_id,
        date,
        time,
        status: In([BookingStatus.PENDING, BookingStatus.CONFIRMED])
      }
    });

    return !existing;
  }
}