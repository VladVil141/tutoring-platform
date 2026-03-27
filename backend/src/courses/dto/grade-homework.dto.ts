import { IsInt, IsOptional, IsString, Min, Max } from 'class-validator';

export class GradeHomeworkDto {
  @IsInt()
  @Min(1)
  @Max(5)
  grade: number;

  @IsString()
  @IsOptional()
  comment?: string;
}