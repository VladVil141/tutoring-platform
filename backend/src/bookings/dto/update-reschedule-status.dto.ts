import { IsEnum } from 'class-validator';
import { RescheduleStatus } from '../entities/reschedule-request.entity';

export class UpdateRescheduleStatusDto {
  @IsEnum(RescheduleStatus)
  status: RescheduleStatus;
}