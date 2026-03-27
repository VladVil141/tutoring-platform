import { IsString, IsOptional, IsInt, Min, IsEnum } from 'class-validator';
import { SectionType } from '../entities/section.entity';

export class UpdateSectionDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsEnum(SectionType)
  @IsOptional()
  type?: SectionType;

  @IsInt()
  @IsOptional()
  @Min(0)
  order?: number;
}