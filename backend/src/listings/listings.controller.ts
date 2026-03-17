import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common';  // <-- добавить ForbiddenException
import { ListingsService } from './listings.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  // Создать объявление (только репетитор)
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Request() req, @Body() createListingDto: CreateListingDto) {
    // Проверяем что пользователь - репетитор
    if (req.user.role !== 'tutor') {
      throw new ForbiddenException('Только репетиторы могут создавать объявления');
    }
    return this.listingsService.create(req.user.userId, createListingDto);
  }

  // Получить все объявления (каталог)
  @Get()
  async findAll(
    @Query('subject') subject?: string,
    @Query('level') level?: string,
    @Query('format') format?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
  ) {
    return this.listingsService.findAll({ subject, level, format, minPrice, maxPrice });
  }

  // Получить объявление по ID
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.listingsService.findOne(+id);
  }

  // Получить мои объявления (для репетитора)
  @Get('my/listings')
  @UseGuards(JwtAuthGuard)
  async findMyListings(@Request() req) {
    if (req.user.role !== 'tutor') {
      throw new ForbiddenException('Только репетиторы могут просматривать свои объявления');
    }
    return this.listingsService.findByTutor(req.user.userId);
  }

  // Обновить объявление
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Request() req,
    @Body() updateListingDto: UpdateListingDto,
  ) {
    if (req.user.role !== 'tutor') {
      throw new ForbiddenException('Только репетиторы могут редактировать объявления');
    }
    return this.listingsService.update(+id, req.user.userId, updateListingDto);
  }

  // Удалить объявление (soft delete)
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @Request() req) {
    if (req.user.role !== 'tutor') {
      throw new ForbiddenException('Только репетиторы могут удалять объявления');
    }
    await this.listingsService.remove(+id, req.user.userId);
    return { message: 'Объявление удалено' };
  }
}