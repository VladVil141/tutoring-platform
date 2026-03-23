import { IsInt, IsDateString, IsString, Matches, IsOptional, IsEnum } from 'class-validator';

export class CreateRescheduleRequestDto {
  @IsInt()
  booking_id: number;

  @IsDateString()
  new_date: string;

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Время должно быть в формате HH:MM',
  })
  new_time: string;

  @IsOptional()
  @IsString()
  reason?: string;
}