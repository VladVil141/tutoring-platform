import { IsString, IsNotEmpty, IsOptional, IsDateString, IsInt, Min } from 'class-validator';

export class CreateHomeworkDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(1)
  section_id: number;

  @IsDateString()
  @IsOptional()
  deadline?: string;
}