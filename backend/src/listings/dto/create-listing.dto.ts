import { IsString, IsNumber, IsEnum, IsOptional, Min, MaxLength } from 'class-validator';
import { ListingLevel, ListingFormat } from '../entities/listing.entity';

export class CreateListingDto {
  @IsString()
  @MaxLength(100)
  subject: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  @MaxLength(1000)
  description: string;

  @IsEnum(ListingLevel)
  @IsOptional()
  level?: ListingLevel;

  @IsEnum(ListingFormat)
  @IsOptional()
  format?: ListingFormat;
}