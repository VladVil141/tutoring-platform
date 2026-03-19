import { IsInt, IsDateString, IsString, Matches } from 'class-validator';

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
}