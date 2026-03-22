import { IsString, IsNumber, IsEnum, IsOptional, Min, Max, IsInt } from 'class-validator';
import { GroupListingLevel, GroupListingFormat } from '../entities/group-listing.entity';

export class CreateGroupListingDto {
  @IsString()
  subject: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  description: string;

  @IsEnum(GroupListingLevel)
  @IsOptional()
  level?: GroupListingLevel;

  @IsEnum(GroupListingFormat)
  @IsOptional()
  format?: GroupListingFormat;

  @IsString()
  schedule: string;

  @IsInt()
  @Min(1)
  min_students: number;

  @IsInt()
  @Min(1)
  @Max(50)
  max_students: number;

  // 👇 НОВОЕ ПОЛЕ
  @IsInt()
  @Min(1)
  @Max(52)
  @IsOptional()
  weeks?: number;
}