import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';  // <-- добавить IsNull
import { Listing } from './entities/listing.entity';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class ListingsService {
  constructor(
    @InjectRepository(Listing)
    private listingRepository: Repository<Listing>,
    private usersService: UsersService,
  ) {}

  async create(tutorId: number, createListingDto: CreateListingDto): Promise<Listing> {
    const tutor = await this.usersService.findById(tutorId);
    if (!tutor) {
      throw new NotFoundException('Репетитор не найден');
    }

    const listing = this.listingRepository.create({
      ...createListingDto,
      tutor_id: tutorId,
      tutor: tutor,
    });

    return await this.listingRepository.save(listing);
  }

  async findAll(filter?: { subject?: string; level?: string; format?: string; minPrice?: number; maxPrice?: number }): Promise<Listing[]> {
    const query = this.listingRepository.createQueryBuilder('listing')
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

  async findOne(id: number): Promise<Listing> {
    const listing = await this.listingRepository.findOne({
      where: { 
        id, 
        is_active: true, 
        deleted_at: IsNull()
      },
      relations: ['tutor', 'tutor.profile'],
    });

    if (!listing) {
      throw new NotFoundException('Объявление не найдено');
    }

    return listing;
  }

  async findByTutor(tutorId: number): Promise<Listing[]> {
    return await this.listingRepository.find({
      where: { 
        tutor_id: tutorId, 
        deleted_at: IsNull()
      },
      relations: ['tutor', 'tutor.profile'],
      order: { created_at: 'DESC' },
    });
  }

  async update(id: number, tutorId: number, updateListingDto: UpdateListingDto): Promise<Listing> {
    const listing = await this.findOne(id);

    if (listing.tutor_id !== tutorId) {
      throw new ForbiddenException('Вы можете редактировать только свои объявления');
    }

    Object.assign(listing, updateListingDto);
    return await this.listingRepository.save(listing);
  }

  async remove(id: number, tutorId: number): Promise<void> {
    const listing = await this.findOne(id);

    if (listing.tutor_id !== tutorId) {
      throw new ForbiddenException('Вы можете удалять только свои объявления');
    }

    // Soft delete
    listing.deleted_at = new Date();
    listing.is_active = false;
    await this.listingRepository.save(listing);
  }
}