import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { GroupListingsService } from './group-listings.service';
import { CreateGroupListingDto } from './dto/create-group-listing.dto';
import { UpdateGroupListingDto } from './dto/update-group-listing.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('group-listings')
export class GroupListingsController {
  constructor(private readonly groupListingsService: GroupListingsService) {}

  // Создать групповое объявление (только репетитор)
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Request() req, @Body() createDto: CreateGroupListingDto) {
    if (req.user.role !== 'tutor') {
      throw new ForbiddenException('Только репетиторы могут создавать групповые объявления');
    }
    return this.groupListingsService.create(req.user.userId, createDto);
  }

  // Получить все групповые объявления (каталог)
  @Get()
  async findAll(
    @Query('subject') subject?: string,
    @Query('level') level?: string,
    @Query('format') format?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
  ) {
    return this.groupListingsService.findAll({ subject, level, format, minPrice, maxPrice });
  }

  // Получить групповое объявление по ID
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.groupListingsService.findOne(+id);
  }

  // Получить мои групповые объявления (для репетитора)
  @Get('my/listings')
  @UseGuards(JwtAuthGuard)
  async findMyListings(@Request() req) {
    if (req.user.role !== 'tutor') {
      throw new ForbiddenException('Только репетиторы могут просматривать свои групповые объявления');
    }
    return this.groupListingsService.findByTutor(req.user.userId);
  }

  // Обновить групповое объявление
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Request() req,
    @Body() updateDto: UpdateGroupListingDto,
  ) {
    if (req.user.role !== 'tutor') {
      throw new ForbiddenException('Только репетиторы могут редактировать групповые объявления');
    }
    return this.groupListingsService.update(+id, req.user.userId, updateDto);
  }

  // Удалить групповое объявление
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @Request() req) {
    if (req.user.role !== 'tutor') {
      throw new ForbiddenException('Только репетиторы могут удалять групповые объявления');
    }
    await this.groupListingsService.remove(+id, req.user.userId);
    return { message: 'Групповое объявление удалено' };
  }
}