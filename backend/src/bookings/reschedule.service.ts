import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { RescheduleRequest, RescheduleStatus } from './entities/reschedule-request.entity';
import { Booking, BookingStatus } from './entities/booking.entity';
import { Attendance } from './entities/attendance.entity';  // 👈 ДОБАВИТЬ
import { RequestedBy } from './entities/reschedule-request.entity';
import { CreateRescheduleRequestDto } from './dto/create-reschedule-request.dto';
import { dateUtils } from '../utils/date.utils';
import { EventsService } from '../events/events.service';

@Injectable()
export class RescheduleService {
  constructor(
    @InjectRepository(RescheduleRequest)
    private rescheduleRepository: Repository<RescheduleRequest>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(Attendance)  // 👈 ДОБАВИТЬ
    private attendanceRepository: Repository<Attendance>,
    private eventsService: EventsService,
  ) {}

  // Создать запрос на перенос (ученик или репетитор)
  async create(userId: number, role: string, createDto: CreateRescheduleRequestDto): Promise<RescheduleRequest> {
    const booking = await this.bookingRepository.findOne({
      where: { id: createDto.booking_id },
      relations: ['listing', 'student', 'student.profile', 'tutor', 'tutor.profile']
    });

    if (!booking) {
      throw new NotFoundException('Заявка не найдена');
    }

    // Проверка прав
    if (role === 'student' && booking.student_id !== userId) {
      throw new ForbiddenException('Вы можете переносить только свои заявки');
    }
    if (role === 'tutor' && booking.tutor_id !== userId) {
      throw new ForbiddenException('Вы можете переносить только заявки своих учеников');
    }

    // Проверка статуса (только подтвержденные можно переносить)
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Можно перенести только подтвержденные занятия');
    }

    // Проверка на уже существующий запрос
    const existing = await this.rescheduleRepository.findOne({
      where: {
        booking_id: createDto.booking_id,
        status: RescheduleStatus.PENDING
      }
    });

    if (existing) {
      throw new BadRequestException('Запрос на перенос уже отправлен');
    }

    // Проверка доступности нового времени
    const existingBooking = await this.bookingRepository.findOne({
      where: {
        tutor_id: booking.tutor_id,
        date: createDto.new_date,
        time: createDto.new_time,
        status: In([BookingStatus.PENDING, BookingStatus.CONFIRMED])
      }
    });

    if (existingBooking) {
      throw new BadRequestException('Выбранное время уже занято');
    }

    // Конвертируем локальное время в UTC
    const utcNew = dateUtils.toUTC(createDto.new_date, createDto.new_time);
    const utcOld = { date: booking.date, time: booking.time };

    // Создаем запрос
    const request = new RescheduleRequest();
    request.booking_id = createDto.booking_id;
    request.requested_by_id = userId;
    request.requested_by = role === 'student' ? RequestedBy.STUDENT : RequestedBy.TUTOR;
    request.new_date = utcNew.date;
    request.new_time = utcNew.time;
    request.old_date = utcOld.date;
    request.old_time = utcOld.time;
    request.reason = createDto.reason || null;
    request.status = RescheduleStatus.PENDING;

    const savedRequest = await this.rescheduleRepository.save(request);
    
    // Уведомление о запросе на перенос
    const fullRequest = await this.rescheduleRepository.findOne({
      where: { id: savedRequest.id },
      relations: ['booking', 'booking.student', 'booking.student.profile', 'booking.tutor', 'booking.tutor.profile', 'requested_by_user', 'requested_by_user.profile']
    });
    
    if (fullRequest) {
      this.eventsService.notifyRescheduleRequested(fullRequest);
    }

    return savedRequest;
  }

  // Получить ожидающие запросы (для ученика или репетитора)
  async getPendingRequests(userId: number, role: string): Promise<RescheduleRequest[]> {
    const where: any = { status: RescheduleStatus.PENDING };
    
    if (role === 'student') {
      where.requested_by = RequestedBy.TUTOR;
      where.booking = { student_id: userId };
    } else if (role === 'tutor') {
      where.requested_by = RequestedBy.STUDENT;
      where.booking = { tutor_id: userId };
    }

    const requests = await this.rescheduleRepository.find({
      where,
      relations: ['booking', 'booking.listing', 'booking.student', 'booking.student.profile', 'booking.tutor', 'booking.tutor.profile', 'requested_by_user', 'requested_by_user.profile'],
      order: { created_at: 'DESC' }
    });

    return requests.map(req => ({
      ...req,
      new_date: dateUtils.toLocal(req.new_date, req.new_time).date,
      new_time: dateUtils.toLocal(req.new_date, req.new_time).time,
      old_date: dateUtils.toLocal(req.old_date, req.old_time).date,
      old_time: dateUtils.toLocal(req.old_date, req.old_time).time
    }));
  }

  // Подтвердить перенос
  async confirm(id: number, userId: number, role: string): Promise<RescheduleRequest> {
    const request = await this.rescheduleRepository.findOne({
      where: { id },
      relations: ['booking', 'booking.student', 'booking.student.profile', 'booking.tutor', 'booking.tutor.profile', 'requested_by_user', 'requested_by_user.profile']
    });

    if (!request) {
      throw new NotFoundException('Запрос не найден');
    }

    // Проверка прав (подтверждает только другая сторона)
    if (role === 'student' && request.requested_by === RequestedBy.STUDENT) {
      throw new ForbiddenException('Вы не можете подтвердить свой запрос');
    }
    if (role === 'tutor' && request.requested_by === RequestedBy.TUTOR) {
      throw new ForbiddenException('Вы не можете подтвердить свой запрос');
    }
    if (request.status !== RescheduleStatus.PENDING) {
      throw new BadRequestException('Можно подтвердить только ожидающие запросы');
    }

    // Обновляем заявку
    const booking = request.booking;
    booking.date = request.new_date;
    booking.time = request.new_time;
    await this.bookingRepository.save(booking);

    // 👇 ОБНОВЛЯЕМ ЗАПИСЬ В ДНЕВНИКЕ
    const attendance = await this.attendanceRepository.findOne({
      where: { booking_id: booking.id }
    });
    
    if (attendance) {
      attendance.date = request.new_date;
      attendance.time = request.new_time;
      await this.attendanceRepository.save(attendance);
      console.log(`📝 Дневник обновлен: запись #${attendance.id} перенесена на ${request.new_date} ${request.new_time}`);
    }

    request.status = RescheduleStatus.CONFIRMED;
    const savedRequest = await this.rescheduleRepository.save(request);
    
    // Уведомление о подтверждении переноса
    this.eventsService.notifyRescheduleStatusChanged(savedRequest);

    return savedRequest;
  }

  // Отклонить перенос
  async reject(id: number, userId: number, role: string): Promise<RescheduleRequest> {
    const request = await this.rescheduleRepository.findOne({
      where: { id },
      relations: ['booking', 'booking.student', 'booking.student.profile', 'booking.tutor', 'booking.tutor.profile', 'requested_by_user', 'requested_by_user.profile']
    });

    if (!request) {
      throw new NotFoundException('Запрос не найден');
    }

    // Проверка прав (отклоняет только другая сторона)
    if (role === 'student' && request.requested_by === RequestedBy.STUDENT) {
      throw new ForbiddenException('Вы не можете отклонить свой запрос');
    }
    if (role === 'tutor' && request.requested_by === RequestedBy.TUTOR) {
      throw new ForbiddenException('Вы не можете отклонить свой запрос');
    }

    if (request.status !== RescheduleStatus.PENDING) {
      throw new BadRequestException('Можно отклонить только ожидающие запросы');
    }

    request.status = RescheduleStatus.REJECTED;
    const savedRequest = await this.rescheduleRepository.save(request);
    
    // Уведомление об отклонении переноса
    this.eventsService.notifyRescheduleStatusChanged(savedRequest);

    return savedRequest;
  }
}