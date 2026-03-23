import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { RescheduleRequest, RescheduleStatus } from './entities/reschedule-request.entity';
import { Booking, BookingStatus } from './entities/booking.entity';
import { RequestedBy } from './entities/reschedule-request.entity';
import { CreateRescheduleRequestDto } from './dto/create-reschedule-request.dto';
import { dateUtils } from '../utils/date.utils';

@Injectable()
export class RescheduleService {
  constructor(
    @InjectRepository(RescheduleRequest)
    private rescheduleRepository: Repository<RescheduleRequest>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
  ) {}

  // Создать запрос на перенос (ученик или репетитор)
  // Создать запрос на перенос (ученик или репетитор)
// Создать запрос на перенос (ученик или репетитор)
async create(userId: number, role: string, createDto: CreateRescheduleRequestDto): Promise<RescheduleRequest> {
  const booking = await this.bookingRepository.findOne({
    where: { id: createDto.booking_id },
    relations: ['listing', 'student', 'tutor']
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

  // Создаем запрос через new RescheduleRequest()
  const request = new RescheduleRequest();
  request.booking_id = createDto.booking_id;
  request.requested_by_id = userId;
  // 👇 ИСПРАВЛЕНО: используем enum RequestedBy
  request.requested_by = role === 'student' ? RequestedBy.STUDENT : RequestedBy.TUTOR;
  request.new_date = utcNew.date;
  request.new_time = utcNew.time;
  request.old_date = booking.date;
  request.old_time = booking.time;
  request.reason = createDto.reason || null;
  request.status = RescheduleStatus.PENDING;

  return await this.rescheduleRepository.save(request);
}

  // Получить ожидающие запросы (для ученика или репетитора)
  // Получить ожидающие запросы (для ученика или репетитора)
async getPendingRequests(userId: number, role: string): Promise<RescheduleRequest[]> {
  const where: any = { status: RescheduleStatus.PENDING };
  
  if (role === 'student') {
    // Ученик видит запросы, где requested_by = tutor (репетитор запросил перенос)
    where.requested_by = RequestedBy.TUTOR;
    // И запрос должен быть для заявки, где student_id = userId
    where.booking = { student_id: userId };
  } else if (role === 'tutor') {
    // Репетитор видит запросы, где requested_by = student (ученик запросил перенос)
    where.requested_by = RequestedBy.STUDENT;
    // И запрос должен быть для заявки, где tutor_id = userId
    where.booking = { tutor_id: userId };
  }

  const requests = await this.rescheduleRepository.find({
    where,
    relations: ['booking', 'booking.listing', 'booking.student', 'booking.student.profile', 'booking.tutor', 'booking.tutor.profile'],
    order: { created_at: 'DESC' }
  });

  // Конвертируем даты в локальное время для отображения
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
      relations: ['booking']
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

    request.status = RescheduleStatus.CONFIRMED;
    return await this.rescheduleRepository.save(request);
  }

  // Отклонить перенос
  async reject(id: number, userId: number, role: string): Promise<RescheduleRequest> {
    const request = await this.rescheduleRepository.findOne({
      where: { id },
      relations: ['booking']
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
    return await this.rescheduleRepository.save(request);
  }
}