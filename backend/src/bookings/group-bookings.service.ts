import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { GroupBooking, GroupBookingStatus } from './entities/group-booking.entity';
import { Booking, BookingStatus } from './entities/booking.entity';
import { CreateGroupBookingDto } from './dto/create-group-booking.dto';
import { GroupListingsService } from '../listings/group-listings.service';
import { UsersService } from '../users/users.service';
import { ChatService } from '../chat/chat.service';
import { dateUtils } from '../utils/date.utils';
import { EventsService } from '../events/events.service';  // 👈 ДОБАВИТЬ
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
    @Inject(forwardRef(() => ChatService))
    private chatService: ChatService,
    private eventsService: EventsService,  // 👈 ДОБАВИТЬ
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
    
    const savedBooking = await this.groupBookingRepository.save(groupBooking);
    
    // 👈 УВЕДОМЛЕНИЕ О НОВОЙ ГРУППОВОЙ ЗАЯВКЕ
    const fullBooking = await this.findOne(savedBooking.id);
    this.eventsService.notifyNewGroupBooking(fullBooking);
    
    return savedBooking;
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
      relations: ['student', 'student.profile', 'group_listing', 'group_listing.tutor', 'group_listing.tutor.profile'],
    });
    
    if (!booking) {
      throw new NotFoundException('Заявка не найдена');
    }
    
    return booking;
  }

  // Получить серию занятий по группе
  async getSeries(groupListingId: number, studentId: number): Promise<Booking[]> {
    const bookings = await this.bookingRepository.find({
      where: {
        student_id: studentId,
        group_booking_id: groupListingId
      },
      order: { date: 'ASC', time: 'ASC' }
    });
    
    // Конвертируем UTC в локальное время
    return bookings.map(booking => {
      const local = dateUtils.toLocal(booking.date, booking.time);
      return {
        ...booking,
        date: local.date,
        time: local.time
      };
    });
  }

  // Получить серию занятий по группе для репетитора
  async getSeriesForTutor(groupListingId: number, tutorId: number): Promise<Booking[]> {
    const bookings = await this.bookingRepository.find({
      where: {
        tutor_id: tutorId,
        group_booking_id: groupListingId
      },
      relations: ['student', 'student.profile', 'listing'],
      order: { date: 'ASC', time: 'ASC' }
    });
    
    // Конвертируем UTC в локальное время
    return bookings.map(booking => {
      const local = dateUtils.toLocal(booking.date, booking.time);
      return {
        ...booking,
        date: local.date,
        time: local.time
      };
    });
  }

  // Создать серию занятий для ученика
  private async createSeriesForStudent(studentId: number, groupListing: any): Promise<void> {
    const schedule = groupListing.schedule;
    const weeks = groupListing.weeks || 4;
    
    // Парсим расписание: "ПН/СР 09:00" -> дни ["ПН", "СР"] и время "09:00"
    const [daysStr, time] = schedule.split(' ');
    const days = daysStr.split('/');
    
    // Маппинг дней недели
    const dayMap: Record<string, number> = {
      'ПН': 1, 'ВТ': 2, 'СР': 3, 'ЧТ': 4, 'ПТ': 5, 'СБ': 6, 'ВС': 0
    };
    
    const targetDays = days.map(d => dayMap[d]);
    
    // Генерируем даты на следующие weeks недель (в UTC)
    const startDate = new Date();
    startDate.setUTCHours(0, 0, 0, 0);
    startDate.setUTCDate(startDate.getUTCDate() + 7); // начинаем со следующей недели
    
    const dates = this.generateDatesFromWeekdaysUTC(startDate, targetDays, weeks);
    
    const recurringId = crypto.randomUUID();
    const recurringEnd = dates[dates.length - 1];
    
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
        recurring_end: recurringEnd,
        group_booking_id: groupListing.id
      });
      await this.bookingRepository.save(booking);
    }
  }

  // Генерация дат по дням недели (в UTC)
  private generateDatesFromWeekdaysUTC(startDate: Date, targetDays: number[], weeks: number): string[] {
    const dates: string[] = [];
    const start = new Date(startDate);
    const startDay = start.getUTCDay();
    
    // Находим первый подходящий день
    let firstDate = new Date(start);
    let daysToAdd = 0;
    
    while (!targetDays.includes((startDay + daysToAdd) % 7) && daysToAdd < 7) {
      daysToAdd++;
    }
    
    if (daysToAdd > 0) {
      firstDate.setUTCDate(start.getUTCDate() + daysToAdd);
    }
    
    // Генерируем даты
    for (let week = 0; week < weeks; week++) {
      for (const targetDay of targetDays) {
        const currentDate = new Date(firstDate);
        const dayDiff = (targetDay - firstDate.getUTCDay() + 7) % 7 + week * 7;
        currentDate.setUTCDate(firstDate.getUTCDate() + dayDiff);
        dates.push(dateUtils.getUTCString(currentDate));
      }
    }
    
    return dates.sort();
  }

  // Одобрить заявку (репетитор) — создаем серию занятий
  async approve(id: number, tutorId: number): Promise<GroupBooking> {
    const booking = await this.findOne(id);
    const groupListing = await this.groupListingsService.findOne(booking.group_listing_id);
    
    if (groupListing.tutor_id !== tutorId) {
      throw new ForbiddenException('Вы можете одобрять только заявки на свои группы');
    }
    
    if (booking.status !== GroupBookingStatus.PENDING) {
      throw new BadRequestException('Можно одобрить только ожидающие заявки');
    }
    
    if (groupListing.current_students >= groupListing.max_students) {
      throw new BadRequestException('Группа уже заполнена');
    }
    
    booking.status = GroupBookingStatus.APPROVED;
    await this.groupBookingRepository.save(booking);
    
    groupListing.current_students += 1;
    await this.groupListingsService.updateCurrentStudents(groupListing.id, groupListing.current_students);
    
    // 👈 УВЕДОМЛЕНИЕ ОБ ИЗМЕНЕНИИ СОСТАВА ГРУППЫ
    const student = await this.usersService.findById(booking.student_id);
    const studentName = student?.profile?.first_name || student?.email?.split('@')[0] || 'Студент';
    this.eventsService.notifyGroupStudentsChanged(groupListing.id, {
      action: 'joined',
      studentId: booking.student_id,
      studentName,
      currentCount: groupListing.current_students,
      maxStudents: groupListing.max_students,
    });
    
    // 👈 УВЕДОМЛЕНИЕ ОБ ИЗМЕНЕНИИ СТАТУСА ГРУППОВОЙ ЗАЯВКИ
    this.eventsService.notifyGroupBookingStatusChanged(booking);
    
    // Добавляем ученика в групповой чат
    await this.chatService.addMemberToGroupChat(groupListing.id, booking.student_id);
    
    await this.createSeriesForStudent(booking.student_id, groupListing);
    
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
    const savedBooking = await this.groupBookingRepository.save(booking);
    
    // 👈 УВЕДОМЛЕНИЕ ОБ ИЗМЕНЕНИИ СТАТУСА ГРУППОВОЙ ЗАЯВКИ
    this.eventsService.notifyGroupBookingStatusChanged(savedBooking);
    
    return savedBooking;
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
    
    const bookings = await this.bookingRepository.find({
      where: {
        student_id: studentId,
        group_booking_id: groupListingId,
        status: In([BookingStatus.PENDING, BookingStatus.CONFIRMED])
      }
    });
    
    const today = new Date().toISOString().split('T')[0];
    for (const booking of bookings) {
      if (booking.date >= today) {
        booking.status = BookingStatus.CANCELLED;
        await this.bookingRepository.save(booking);
      }
    }
    
    await this.groupBookingRepository.remove(groupBooking);
    
    const groupListing = await this.groupListingsService.findOne(groupListingId);
    groupListing.current_students -= 1;
    await this.groupListingsService.updateCurrentStudents(groupListing.id, groupListing.current_students);
    
    // 👈 УВЕДОМЛЕНИЕ ОБ ИЗМЕНЕНИИ СОСТАВА ГРУППЫ
    const student = await this.usersService.findById(studentId);
    const studentName = student?.profile?.first_name || student?.email?.split('@')[0] || 'Студент';
    this.eventsService.notifyGroupStudentsChanged(groupListingId, {
      action: 'left',
      studentId,
      studentName,
      currentCount: groupListing.current_students,
      maxStudents: groupListing.max_students,
    });
    
    // Удаляем ученика из группового чата
    await this.chatService.removeMemberFromGroupChat(groupListingId, studentId);
    
    if (!groupListing.is_active && groupListing.current_students < groupListing.max_students) {
      await this.groupListingsService.updateActiveStatus(groupListing.id, true);
    }
  }
}