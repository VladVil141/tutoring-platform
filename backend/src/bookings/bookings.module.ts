import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { GroupBookingsService } from './group-bookings.service';
import { GroupBookingsController } from './group-bookings.controller';
import { Booking } from './entities/booking.entity';
import { GroupBooking } from './entities/group-booking.entity';
import { ListingsModule } from '../listings/listings.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, GroupBooking]),
    ListingsModule,
    UsersModule,
  ],
  controllers: [BookingsController, GroupBookingsController],
  providers: [BookingsService, GroupBookingsService],
  exports: [BookingsService, GroupBookingsService],
})
export class BookingsModule {}