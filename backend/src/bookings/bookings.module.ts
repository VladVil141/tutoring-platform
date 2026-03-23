import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { GroupBookingsService } from './group-bookings.service';
import { GroupBookingsController } from './group-bookings.controller';
import { RescheduleService } from './reschedule.service';
import { RescheduleController } from './reschedule.controller';
import { Booking } from './entities/booking.entity';
import { GroupBooking } from './entities/group-booking.entity';
import { RescheduleRequest } from './entities/reschedule-request.entity';
import { ListingsModule } from '../listings/listings.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, GroupBooking, RescheduleRequest]),
    ListingsModule,
    UsersModule,
  ],
  controllers: [BookingsController, GroupBookingsController, RescheduleController],
  providers: [BookingsService, GroupBookingsService, RescheduleService],
  exports: [BookingsService, GroupBookingsService, RescheduleService],
})
export class BookingsModule {}