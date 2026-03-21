import { IsOptional, IsEnum } from 'class-validator';
import { GroupBookingStatus } from '../entities/group-booking.entity';

export class GroupBookingQueryDto {
  @IsOptional()
  @IsEnum(GroupBookingStatus)
  status?: GroupBookingStatus;
}