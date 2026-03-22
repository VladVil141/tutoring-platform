import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Booking, BookingStatus } from './entities/booking.entity';
import { GroupBooking, GroupBookingStatus } from './entities/group-booking.entity';  // 👈 добавить
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateRecurringBookingDto } from './dto/create-recurring-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { BookingQueryDto } from './dto/booking-query.dto';
import { ListingsService } from '../listings/listings.service';
import { GroupListingsService } from '../listings/group-listings.service';  // 👈 добавить
import { UsersService } from '../users/users.service';
import { ScheduleQueryDto, ScheduleView } from './dto/schedule-query.dto';
import { ScheduleEventDto } from './dto/schedule-response.dto';
import { IsNull } from 'typeorm';
import * as crypto from 'crypto';


@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(GroupBooking)  // 👈 добавить
    private groupBookingRepository: Repository<GroupBooking>,
    private listingsService: ListingsService,
    private groupListingsService: GroupListingsService,  // 👈 добавить
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
  const where: any = { 
    student_id: studentId,
    group_booking_id: IsNull()  // 👈 исключаем групповые заявки
  };

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
  const where: any = { 
    tutor_id: tutorId,
    group_booking_id: IsNull()  // 👈 исключаем групповые заявки
  };

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

  // Получить расписание (индивидуальные + групповые)
async getSchedule(userId: number, role: string, query: ScheduleQueryDto): Promise<ScheduleEventDto[]> {
  const events: ScheduleEventDto[] = [];
  
  // Определяем диапазон дат
  let startDate: Date, endDate: Date;
  const today = new Date();
  
  if (query.start_date && query.end_date) {
    startDate = new Date(query.start_date);
    endDate = new Date(query.end_date);
  } else if (query.view === ScheduleView.DAY) {
    startDate = today;
    endDate = today;
  } else if (query.view === ScheduleView.WEEK) {
    startDate = new Date(today);
    startDate.setDate(today.getDate() - today.getDay() + 1);
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
  } else {
    // MONTH
    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  }
  
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];
  
  if (role === 'student') {
    // Индивидуальные занятия ученика
    const individualBookings = await this.bookingRepository.find({
      where: {
        student_id: userId,
        date: Between(startStr, endStr),
        status: In([BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.COMPLETED])
      },
      relations: ['listing', 'listing.tutor', 'listing.tutor.profile']
    });
    
    for (const booking of individualBookings) {
      events.push({
        id: booking.id,
        type: 'individual',
        subject: booking.listing.subject,
        date: booking.date,
        time: booking.time,
        status: booking.status,
        tutor_name: `${booking.listing.tutor.profile.first_name} ${booking.listing.tutor.profile.last_name}`,
        tutor_id: booking.listing.tutor.id,
      });
    }
    
    // Групповые занятия ученика
    const groupBookings = await this.groupBookingRepository.find({
      where: {
        student_id: userId,
        status: GroupBookingStatus.APPROVED
      },
      relations: ['group_listing', 'group_listing.tutor', 'group_listing.tutor.profile']
    });
    
    for (const gb of groupBookings) {
      const schedule = gb.group_listing.schedule;
      const dates = this.generateDatesFromSchedule(schedule, startDate, endDate);
      
      for (const date of dates) {
        events.push({
          id: gb.id,
          type: 'group',
          subject: gb.group_listing.subject,
          date,
          time: this.extractTimeFromSchedule(schedule),
          status: 'confirmed',
          tutor_name: `${gb.group_listing.tutor.profile.first_name} ${gb.group_listing.tutor.profile.last_name}`,
          tutor_id: gb.group_listing.tutor.id,
          group_size: gb.group_listing.current_students,
          max_students: gb.group_listing.max_students
        });
      }
    }
  } else if (role === 'tutor') {
    // Индивидуальные занятия репетитора
    const individualBookings = await this.bookingRepository.find({
      where: {
        tutor_id: userId,
        date: Between(startStr, endStr),
        status: In([BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.COMPLETED])
      },
      relations: ['student', 'student.profile', 'listing']
    });
    
    for (const booking of individualBookings) {
      events.push({
        id: booking.id,
        type: 'individual',
        subject: booking.listing.subject,
        date: booking.date,
        time: booking.time,
        status: booking.status,
        student_name: `${booking.student.profile.first_name} ${booking.student.profile.last_name}`,
        student_id: booking.student.id,
      });
    }
    
    // Групповые занятия репетитора
    const groupListings = await this.groupListingsService.findAll();
    
    for (const gl of groupListings) {
      if (gl.tutor_id !== userId) continue;
      
      const schedule = gl.schedule;
      const dates = this.generateDatesFromSchedule(schedule, startDate, endDate);
      
      for (const date of dates) {
        events.push({
          id: gl.id,
          type: 'group',
          subject: gl.subject,
          date,
          time: this.extractTimeFromSchedule(schedule),
          status: 'confirmed',
          group_size: gl.current_students,
          max_students: gl.max_students
        });
      }
    }
  }
  
  // Сортировка по дате и времени
  return events.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.time.localeCompare(b.time);
  });
}

// Вспомогательные методы для календаря
  private generateDatesFromSchedule(schedule: string, startDate: Date, endDate: Date): string[] {
    const dates: string[] = [];
    const [daysStr, time] = schedule.split(' ');
    const days = daysStr.split('/');
    
    const dayMap: Record<string, number> = {
      'ПН': 1, 'ВТ': 2, 'СР': 3, 'ЧТ': 4, 'ПТ': 5, 'СБ': 6, 'ВС': 0
    };
    
    let current = new Date(startDate);
    while (current <= endDate) {
      const currentDay = current.getDay();
      if (days.some(day => dayMap[day] === currentDay)) {
        dates.push(current.toISOString().split('T')[0]);
      }
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  }

  private extractTimeFromSchedule(schedule: string): string {
    const parts = schedule.split(' ');
    return parts[parts.length - 1];
  }
}