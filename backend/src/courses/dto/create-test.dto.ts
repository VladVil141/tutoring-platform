import { IsString, IsNotEmpty, IsOptional, IsInt, Min, ValidateNested, IsArray, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTestQuestionDto {
  @IsString()
  @IsNotEmpty()
  question_text: string;

  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  options: string[];

  @IsString()
  @IsNotEmpty()
  correct_answer: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  points?: number;
}

export class CreateTestDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(1)
  section_id: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateTestQuestionDto)
  questions: CreateTestQuestionDto[];
}