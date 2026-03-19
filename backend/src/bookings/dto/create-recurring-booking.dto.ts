import { IsInt, IsString, Matches, IsArray, IsNumber, Min, Max, IsOptional } from 'class-validator';

export class CreateRecurringBookingDto {
  @IsInt()
  listing_id: number;

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Время должно быть в формате HH:MM',
  })
  time: string;

  @IsArray()
  @IsString({ each: true })
  @Matches(/^(ПН|ВТ|СР|ЧТ|ПТ|СБ|ВС)$/, { 
    each: true,
    message: 'Дни недели должны быть: ПН, ВТ, СР, ЧТ, ПТ, СБ, ВС'
  })
  weekdays: string[];

  @IsNumber()
  @Min(1)
  @Max(52)
  weeks: number;
}