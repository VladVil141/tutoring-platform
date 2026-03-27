import { IsString, IsOptional, IsDateString } from 'class-validator';

export class UpdateHomeworkDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  deadline?: string;
}