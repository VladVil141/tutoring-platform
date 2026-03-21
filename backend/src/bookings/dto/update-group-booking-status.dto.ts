import { IsEnum } from 'class-validator';
import { GroupBookingStatus } from '../entities/group-booking.entity';

export class UpdateGroupBookingStatusDto {
  @IsEnum(GroupBookingStatus)
  status: GroupBookingStatus;
}