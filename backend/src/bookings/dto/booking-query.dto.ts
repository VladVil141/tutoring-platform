import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { BookingStatus } from '../entities/booking.entity';

export class BookingQueryDto {
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;
}