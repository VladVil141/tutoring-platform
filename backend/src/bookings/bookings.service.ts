import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Booking, BookingStatus } from './entities/booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { BookingQueryDto } from './dto/booking-query.dto';
import { ListingsService } from '../listings/listings.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    private listingsService: ListingsService,
    private usersService: UsersService,
  ) {}

  // Создать заявку (ученик)
  async create(studentId: number, createDto: CreateBookingDto): Promise<Booking> {
    // Проверяем существование объявления
    const listing = await this.listingsService.findOne(createDto.listing_id);
    
    // Проверяем что ученик не пытается записаться к самому себе
    if (listing.tutor_id === studentId) {
      throw new ForbiddenException('Нельзя записаться к самому себе');
    }

    // Проверяем нет ли уже заявки на это время
    const existingBooking = await this.bookingRepository.findOne({
      where: {
        tutor_id: listing.tutor_id,
        date: createDto.date,
        time: createDto.time,
        status: BookingStatus.CONFIRMED
      }
    });

    if (existingBooking) {
      throw new BadRequestException('Это время уже занято');
    }

    // Создаем заявку
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

    // Проверка прав
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
    // Получаем tutor_id из объявления
    const listing = await this.listingsService.findOne(listingId);
  
    // Проверяем занятость для статусов pending И confirmed
    const existing = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.tutor_id = :tutor_id', { tutor_id: listing.tutor_id })
      .andWhere('booking.date = :date', { date })
      .andWhere('booking.time = :time', { time })
      .andWhere('booking.status IN (:...statuses)', { 
        statuses: ['pending', 'confirmed'] 
      })
      .getOne();

    return !existing;
  }
}