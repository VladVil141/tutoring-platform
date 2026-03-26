import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { GroupBookingsService } from './group-bookings.service';
import { GroupBookingsController } from './group-bookings.controller';
import { RescheduleService } from './reschedule.service';
import { RescheduleController } from './reschedule.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { Booking } from './entities/booking.entity';
import { GroupBooking } from './entities/group-booking.entity';
import { RescheduleRequest } from './entities/reschedule-request.entity';
import { Attendance } from './entities/attendance.entity';
import { ListingsModule } from '../listings/listings.module';
import { UsersModule } from '../users/users.module';
import { ChatModule } from '../chat/chat.module';
import { EventsModule } from '../events/events.module';  // 👈 ДОБАВИТЬ

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, GroupBooking, RescheduleRequest, Attendance]),
    ListingsModule,
    UsersModule,
    forwardRef(() => ChatModule),
    EventsModule,  // 👈 ДОБАВИТЬ (без forwardRef)
  ],
  controllers: [BookingsController, GroupBookingsController, RescheduleController, AttendanceController],
  providers: [BookingsService, GroupBookingsService, RescheduleService, AttendanceService],
  exports: [BookingsService, GroupBookingsService, RescheduleService, AttendanceService],
})
export class BookingsModule {}