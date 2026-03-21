import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GroupBooking, GroupBookingStatus } from './entities/group-booking.entity';
import { CreateGroupBookingDto } from './dto/create-group-booking.dto';
import { GroupListingsService } from '../listings/group-listings.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class GroupBookingsService {
  constructor(
    @InjectRepository(GroupBooking)
    private groupBookingRepository: Repository<GroupBooking>,
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

  // Одобрить заявку (репетитор)
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

  // Отменить заявку (ученик)
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

  // Выйти из группы (ученик)
  async leaveGroup(groupListingId: number, studentId: number): Promise<void> {
    const booking = await this.groupBookingRepository.findOne({
      where: {
        group_listing_id: groupListingId,
        student_id: studentId,
        status: GroupBookingStatus.APPROVED
      }
    });
    
    if (!booking) {
      throw new NotFoundException('Вы не состоите в этой группе');
    }
    
    // Удаляем заявку
    await this.groupBookingRepository.remove(booking);
    
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