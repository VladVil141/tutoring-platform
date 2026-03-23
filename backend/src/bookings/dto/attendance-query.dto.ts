import { IsOptional, IsDateString, IsString } from 'class-validator';

export class AttendanceQueryDto {
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsString()
  student_id?: string;
}