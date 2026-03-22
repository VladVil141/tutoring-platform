import { IsOptional, IsDateString, IsEnum } from 'class-validator';

export enum ScheduleView {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month'
}

export class ScheduleQueryDto {
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsEnum(ScheduleView)
  view?: ScheduleView;
}