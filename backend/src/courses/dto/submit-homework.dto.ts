import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SubmitHomeworkDto {
  @IsInt()
  @IsNotEmpty()
  homework_id: number;

  @IsString()
  @IsOptional()
  comment?: string;
}