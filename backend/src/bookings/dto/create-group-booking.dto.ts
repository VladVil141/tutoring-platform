import { IsInt } from 'class-validator';

export class CreateGroupBookingDto {
  @IsInt()
  group_listing_id: number;
}