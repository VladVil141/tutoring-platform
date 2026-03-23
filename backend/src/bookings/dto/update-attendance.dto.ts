import { IsOptional, IsBoolean, IsString } from 'class-validator';

export class UpdateAttendanceDto {
  @IsOptional()
  @IsBoolean()
  visited?: boolean;

  @IsOptional()
  @IsBoolean()
  paid?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}