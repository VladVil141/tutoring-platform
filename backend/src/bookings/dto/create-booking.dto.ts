import { IsInt, IsDateString, IsString, Matches, IsOptional } from 'class-validator';

export class CreateBookingDto {
  @IsInt()
  listing_id: number;

  @IsDateString()
  date: string;

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Время должно быть в формате HH:MM',
  })
  time: string;

  // Опциональные поля для регулярных занятий
  @IsOptional()
  @IsString()
  recurring_pattern?: string;

  @IsOptional()
  @IsDateString()
  recurring_end?: string;
}