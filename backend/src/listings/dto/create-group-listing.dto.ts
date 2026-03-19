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
  schedule: string; // например: "Пн/Ср 18:00"

  @IsInt()
  @Min(1)
  min_students: number;

  @IsInt()
  @Min(1)
  max_students: number;
}