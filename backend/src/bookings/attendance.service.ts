import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Attendance } from './entities/attendance.entity';
import { Booking, BookingStatus } from './entities/booking.entity';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { AttendanceQueryDto } from './dto/attendance-query.dto';
import { dateUtils } from '../utils/date.utils';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
  ) {}

  // Создать запись посещения (вызывается при подтверждении заявки)
  async createFromBooking(booking: Booking): Promise<Attendance> {
  const attendance = new Attendance();
  attendance.booking_id = booking.id;
  attendance.student_id = booking.student_id;
  attendance.tutor_id = booking.tutor_id;
  attendance.date = booking.date;
  attendance.time = booking.time;
  attendance.visited = false;
  attendance.paid = false;
  attendance.notes = null;

  return await this.attendanceRepository.save(attendance);
}

  // Получить записи для репетитора
  async getTutorAttendances(tutorId: number, query: AttendanceQueryDto): Promise<Attendance[]> {
    const where: any = { tutor_id: tutorId };

    if (query.start_date && query.end_date) {
      where.date = Between(query.start_date, query.end_date);
    }

    if (query.student_id) {
      where.student_id = parseInt(query.student_id, 10);
    }

    const attendances = await this.attendanceRepository.find({
      where,
      relations: ['booking', 'booking.listing', 'student', 'student.profile'],
      order: { date: 'ASC', time: 'ASC' },
    });

    // Конвертируем даты в локальное время для отображения
    return attendances.map(att => ({
      ...att,
      date: dateUtils.toLocal(att.date, att.time).date,
      time: dateUtils.toLocal(att.date, att.time).time,
    }));
  }

  // Обновить запись посещения
async updateAttendance(id: number, tutorId: number, updateDto: UpdateAttendanceDto): Promise<Attendance> {
  const attendance = await this.attendanceRepository.findOne({
    where: { id },
    relations: ['booking', 'booking.listing', 'student', 'student.profile'],
  });

  if (!attendance) {
    throw new NotFoundException('Запись не найдена');
  }

  if (attendance.tutor_id !== tutorId) {
    throw new ForbiddenException('Вы можете редактировать только свои записи');
  }

  // Обновляем поля
  if (updateDto.visited !== undefined) {
    attendance.visited = updateDto.visited;
  }
  if (updateDto.paid !== undefined) {
    attendance.paid = updateDto.paid;
  }
  if (updateDto.notes !== undefined) {
    attendance.notes = updateDto.notes;
  }

  const saved = await this.attendanceRepository.save(attendance);

  // Если и посещение, и оплата отмечены — завершаем заявку
if (saved.visited && saved.paid) {
  const booking = await this.bookingRepository.findOne({
    where: { id: attendance.booking_id },
  });
  if (booking && booking.status === BookingStatus.CONFIRMED) {
    booking.status = BookingStatus.COMPLETED;
    await this.bookingRepository.save(booking);
    console.log('Заявка #' + booking.id + ' обновлена на COMPLETED'); // 👈 добавить для отладки
  }
}

  // Возвращаем обновленную запись с полными связями
  const result = await this.attendanceRepository.findOne({
    where: { id: saved.id },
    relations: ['booking', 'booking.listing', 'student', 'student.profile'],
  });

  if (!result) {
    throw new NotFoundException('Запись не найдена после обновления');
  }

  // Конвертируем даты в локальное время (для +9 UTC)
  const local = dateUtils.toLocal(result.date, result.time);
  
  // Возвращаем объект с правильными типами
  return {
    ...result,
    date: local.date,
    time: local.time,
  };
}

  // Получить одну запись
  async findOne(id: number, tutorId: number): Promise<Attendance> {
    const attendance = await this.attendanceRepository.findOne({
      where: { id },
      relations: ['booking', 'booking.listing', 'student', 'student.profile'],
    });

    if (!attendance) {
      throw new NotFoundException('Запись не найдена');
    }

    if (attendance.tutor_id !== tutorId) {
      throw new ForbiddenException('Вы можете просматривать только свои записи');
    }

    // Конвертируем даты в локальное время
    return {
      ...attendance,
      date: dateUtils.toLocal(attendance.date, attendance.time).date,
      time: dateUtils.toLocal(attendance.date, attendance.time).time,
    };
  }
}