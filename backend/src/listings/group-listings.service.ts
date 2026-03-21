import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { GroupListing } from './entities/group-listing.entity';
import { CreateGroupListingDto } from './dto/create-group-listing.dto';
import { UpdateGroupListingDto } from './dto/update-group-listing.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class GroupListingsService {
  constructor(
    @InjectRepository(GroupListing)
    private groupListingRepository: Repository<GroupListing>,
    private usersService: UsersService,
  ) {}

  async create(tutorId: number, createDto: CreateGroupListingDto): Promise<GroupListing> {
    const tutor = await this.usersService.findById(tutorId);
    if (!tutor) {
      throw new NotFoundException('Репетитор не найден');
    }

    const listing = this.groupListingRepository.create({
      ...createDto,
      tutor_id: tutorId,
      tutor: tutor,
      current_students: 0,
    });

    return await this.groupListingRepository.save(listing);
  }

  async findAll(filter?: { 
    subject?: string; 
    level?: string; 
    format?: string; 
    minPrice?: number; 
    maxPrice?: number 
  }): Promise<GroupListing[]> {
    const query = this.groupListingRepository.createQueryBuilder('listing')
      .leftJoinAndSelect('listing.tutor', 'tutor')
      .leftJoinAndSelect('tutor.profile', 'profile')
      .where('listing.is_active = :active', { active: true })
      .andWhere('listing.deleted_at IS NULL');

    if (filter?.subject) {
      query.andWhere('listing.subject LIKE :subject', { subject: `%${filter.subject}%` });
    }

    if (filter?.level) {
      query.andWhere('listing.level = :level', { level: filter.level });
    }

    if (filter?.format) {
      query.andWhere('listing.format = :format', { format: filter.format });
    }

    if (filter?.minPrice) {
      query.andWhere('listing.price >= :minPrice', { minPrice: filter.minPrice });
    }

    if (filter?.maxPrice) {
      query.andWhere('listing.price <= :maxPrice', { maxPrice: filter.maxPrice });
    }

    return await query.getMany();
  }

  async findOne(id: number): Promise<GroupListing> {
    const listing = await this.groupListingRepository.findOne({
      where: { id, is_active: true, deleted_at: IsNull() },
      relations: ['tutor', 'tutor.profile'],
    });

    if (!listing) {
      throw new NotFoundException('Групповое объявление не найдено');
    }

    return listing;
  }

  async findByTutor(tutorId: number): Promise<GroupListing[]> {
    return await this.groupListingRepository.find({
      where: { tutor_id: tutorId, deleted_at: IsNull() },
      relations: ['tutor', 'tutor.profile'],
      order: { created_at: 'DESC' },
    });
  }

  async update(id: number, tutorId: number, updateDto: UpdateGroupListingDto): Promise<GroupListing> {
    const listing = await this.findOne(id);

    if (listing.tutor_id !== tutorId) {
      throw new ForbiddenException('Вы можете редактировать только свои объявления');
    }

    Object.assign(listing, updateDto);
    return await this.groupListingRepository.save(listing);
  }

  async remove(id: number, tutorId: number): Promise<void> {
    const listing = await this.findOne(id);

    if (listing.tutor_id !== tutorId) {
      throw new ForbiddenException('Вы можете удалять только свои объявления');
    }

    listing.deleted_at = new Date();
    listing.is_active = false;
    await this.groupListingRepository.save(listing);
  }

  // Обновить количество учеников
  async updateCurrentStudents(id: number, currentStudents: number): Promise<void> {
    await this.groupListingRepository.update(id, { current_students: currentStudents });
  }

  // Обновить статус активности
  async updateActiveStatus(id: number, isActive: boolean): Promise<void> {
    await this.groupListingRepository.update(id, { is_active: isActive });
  }
}