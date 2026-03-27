import { IsString, IsNotEmpty, IsEnum, IsOptional, IsInt, Min } from 'class-validator';
import { SectionType } from '../entities/section.entity';

export class CreateSectionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsEnum(SectionType)
  type: SectionType;

  @IsInt()
  @IsOptional()
  @Min(0)
  order?: number;
}