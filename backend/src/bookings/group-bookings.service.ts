import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { GroupBooking, GroupBookingStatus } from './entities/group-booking.entity';
import { Booking, BookingStatus } from './entities/booking.entity';
import { CreateGroupBookingDto } from './dto/create-group-booking.dto';
import { GroupListingsService } from '../listings/group-listings.service';
import { UsersService } from '../users/users.service';
import * as crypto from 'crypto';

@Injectable()
export class GroupBookingsService {
  constructor(
    @InjectRepository(GroupBooking)
    private groupBookingRepository: Repository<GroupBooking>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    private groupListingsService: GroupListingsService,
    private usersService: UsersService,
  ) {}

  // Подать заявку на групповое занятие (ученик)
  async create(studentId: number, createDto: CreateGroupBookingDto): Promise<GroupBooking> {
    // Проверяем существование группового объявления
    const groupListing = await this.groupListingsService.findOne(createDto.group_listing_id);
    
    // Проверяем что ученик не пытается записаться к самому себе
    if (groupListing.tutor_id === studentId) {
      throw new ForbiddenException('Нельзя записаться к самому себе');
    }
    
    // Проверяем активно ли объявление
    if (!groupListing.is_active) {
      throw new BadRequestException('Группа уже заполнена или неактивна');
    }
    
    // Проверяем не подавал ли уже заявку
    const existing = await this.groupBookingRepository.findOne({
      where: {
        group_listing_id: createDto.group_listing_id,
        student_id: studentId,
        status: GroupBookingStatus.PENDING
      }
    });
    
    if (existing) {
      throw new BadRequestException('Вы уже подали заявку в эту группу');
    }
    
    // Проверяем не состоит ли уже в группе
    const approved = await this.groupBookingRepository.findOne({
      where: {
        group_listing_id: createDto.group_listing_id,
        student_id: studentId,
        status: GroupBookingStatus.APPROVED
      }
    });
    
    if (approved) {
      throw new BadRequestException('Вы уже состоите в этой группе');
    }
    
    // Создаем заявку
    const groupBooking = this.groupBookingRepository.create({
      student_id: studentId,
      group_listing_id: createDto.group_listing_id,
      status: GroupBookingStatus.PENDING,
    });
    
    return await this.groupBookingRepository.save(groupBooking);
  }

  // Получить мои заявки (для ученика)
  async findMyBookings(studentId: number, status?: GroupBookingStatus): Promise<GroupBooking[]> {
    const where: any = { student_id: studentId };
    if (status) {
      where.status = status;
    }
    
    return await this.groupBookingRepository.find({
      where,
      relations: ['group_listing', 'group_listing.tutor', 'group_listing.tutor.profile'],
      order: { created_at: 'DESC' },
    });
  }

  // Получить заявки ко мне (для репетитора)
  async findTutorBookings(tutorId: number, status?: GroupBookingStatus): Promise<GroupBooking[]> {
    const where: any = { 
      group_listing: { tutor_id: tutorId }
    };
    if (status) {
      where.status = status;
    }
    
    return await this.groupBookingRepository.find({
      where,
      relations: ['student', 'student.profile', 'group_listing'],
      order: { created_at: 'DESC' },
    });
  }

  // Получить одну заявку
  async findOne(id: number): Promise<GroupBooking> {
    const booking = await this.groupBookingRepository.findOne({
      where: { id },
      relations: ['student', 'student.profile', 'group_listing', 'group_listing.tutor'],
    });
    
    if (!booking) {
      throw new NotFoundException('Заявка не найдена');
    }
    
    return booking;
  }

  // Получить серию занятий по группе
  async getSeries(groupListingId: number, studentId: number): Promise<Booking[]> {
    return await this.bookingRepository.find({
      where: {
        student_id: studentId,
        group_booking_id: groupListingId  // 👈 здесь groupListingId
      },
      order: { date: 'ASC', time: 'ASC' }
    });
  }
  // Получить серию занятий по группе для репетитора
async getSeriesForTutor(groupListingId: number, tutorId: number): Promise<Booking[]> {
  return await this.bookingRepository.find({
    where: {
      tutor_id: tutorId,
      group_booking_id: groupListingId
    },
    relations: ['student', 'student.profile', 'listing'],
    order: { date: 'ASC', time: 'ASC' }
  });
}

  // Генерация дат по дням недели
private generateDatesFromWeekdays(startDate: Date, targetDays: number[], weeks: number): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  
  if (isNaN(start.getTime())) {
    console.error('Invalid startDate:', startDate);
    return dates;
  }
  
  const startDay = start.getDay();
  
  // Находим первый подходящий день
  let firstDate = new Date(start);
  let daysToAdd = 0;
  
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
      if (!isNaN(currentDate.getTime())) {
        dates.push(currentDate.toISOString().split('T')[0]);
      }
    }
  }
  
  return dates.sort();
}

  // Создать серию занятий для ученика
private async createSeriesForStudent(studentId: number, groupListing: any): Promise<void> {
  const schedule = groupListing.schedule;
  const weeks = groupListing.weeks || 4;
  
  // Парсим расписание: "Пн/Ср 19:00" -> дни ["ПН", "СР"] и время "19:00"
  const [daysStr, time] = schedule.split(' ');
  const days = daysStr.split('/');
  
  // Маппинг дней недели
  const dayMap: Record<string, number> = {
    'ПН': 1, 'ВТ': 2, 'СР': 3, 'ЧТ': 4, 'ПТ': 5, 'СБ': 6, 'ВС': 0
  };
  
  const targetDays = days.map(d => dayMap[d]);
  
  // Генерируем даты на следующие weeks недель
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 7); // начинаем со следующей недели
  
  console.log('Start date for series:', startDate); // 👈 отладка
  console.log('Weeks:', weeks);
  console.log('Target days:', targetDays);
  
  const dates = this.generateDatesFromWeekdays(startDate, targetDays, weeks);
  
  console.log('Generated dates:', dates); // 👈 отладка
  
  const recurringId = crypto.randomUUID();
  
  // Создаем занятия для каждого дня
  for (const date of dates) {
    const booking = this.bookingRepository.create({
      student_id: studentId,
      tutor_id: groupListing.tutor_id,
      listing_id: undefined,
      date: date,
      time: time,
      status: BookingStatus.CONFIRMED,
      recurring_id: recurringId,
      recurring_pattern: schedule,
      recurring_end: dates[dates.length - 1],
      group_booking_id: groupListing.id  // 👈 здесь groupListing.id, а не group_booking_id
    });
    await this.bookingRepository.save(booking);
  }
}

  // Одобрить заявку (репетитор) — создаем серию занятий
  async approve(id: number, tutorId: number): Promise<GroupBooking> {
    const booking = await this.findOne(id);
    const groupListing = await this.groupListingsService.findOne(booking.group_listing_id);
    
    // Проверка прав
    if (groupListing.tutor_id !== tutorId) {
      throw new ForbiddenException('Вы можете одобрять только заявки на свои группы');
    }
    
    if (booking.status !== GroupBookingStatus.PENDING) {
      throw new BadRequestException('Можно одобрить только ожидающие заявки');
    }
    
    // Проверка наличия мест
    if (groupListing.current_students >= groupListing.max_students) {
      throw new BadRequestException('Группа уже заполнена');
    }
    
    // Обновляем статус
    booking.status = GroupBookingStatus.APPROVED;
    await this.groupBookingRepository.save(booking);
    
    // Увеличиваем счетчик учеников в группе
    groupListing.current_students += 1;
    await this.groupListingsService.updateCurrentStudents(groupListing.id, groupListing.current_students);
    
    // 👇 СОЗДАЕМ СЕРИЮ ЗАНЯТИЙ
    await this.createSeriesForStudent(booking.student_id, groupListing);
    
    // Если группа заполнилась — скрываем объявление
    if (groupListing.current_students >= groupListing.max_students) {
      await this.groupListingsService.updateActiveStatus(groupListing.id, false);
    }
    
    return booking;
  }

  // Отклонить заявку (репетитор)
  async reject(id: number, tutorId: number): Promise<GroupBooking> {
    const booking = await this.findOne(id);
    const groupListing = await this.groupListingsService.findOne(booking.group_listing_id);
    
    if (groupListing.tutor_id !== tutorId) {
      throw new ForbiddenException('Вы можете отклонять только заявки на свои группы');
    }
    
    if (booking.status !== GroupBookingStatus.PENDING) {
      throw new BadRequestException('Можно отклонить только ожидающие заявки');
    }
    
    booking.status = GroupBookingStatus.REJECTED;
    return await this.groupBookingRepository.save(booking);
  }

  // Отменить заявку (ученик) — только для pending
  async cancel(id: number, studentId: number): Promise<void> {
    const booking = await this.findOne(id);
    
    if (booking.student_id !== studentId) {
      throw new ForbiddenException('Вы можете отменять только свои заявки');
    }
    
    if (booking.status !== GroupBookingStatus.PENDING) {
      throw new BadRequestException('Можно отменить только ожидающие заявки');
    }
    
    await this.groupBookingRepository.remove(booking);
  }

  // Выйти из группы (ученик) — отменяем всю серию занятий
  async leaveGroup(groupListingId: number, studentId: number): Promise<void> {
    const groupBooking = await this.groupBookingRepository.findOne({
      where: {
        group_listing_id: groupListingId,
        student_id: studentId,
        status: GroupBookingStatus.APPROVED
      }
    });
    
    if (!groupBooking) {
      throw new NotFoundException('Вы не состоите в этой группе');
    }
    
    // Находим все созданные занятия для этого ученика по этой группе
    const bookings = await this.bookingRepository.find({
      where: {
        student_id: studentId,
        group_booking_id: groupListingId,
        status: In([BookingStatus.PENDING, BookingStatus.CONFIRMED])
      }
    });
    
    // Отменяем все будущие занятия
    const today = new Date().toISOString().split('T')[0];
    for (const booking of bookings) {
      if (booking.date >= today) {
        booking.status = BookingStatus.CANCELLED;
        await this.bookingRepository.save(booking);
      }
    }
    
    // Удаляем групповую заявку
    await this.groupBookingRepository.remove(groupBooking);
    
    // Уменьшаем счетчик учеников
    const groupListing = await this.groupListingsService.findOne(groupListingId);
    groupListing.current_students -= 1;
    await this.groupListingsService.updateCurrentStudents(groupListing.id, groupListing.current_students);
    
    // Если группа была скрыта, показываем обратно
    if (!groupListing.is_active && groupListing.current_students < groupListing.max_students) {
      await this.groupListingsService.updateActiveStatus(groupListing.id, true);
    }
  }
}