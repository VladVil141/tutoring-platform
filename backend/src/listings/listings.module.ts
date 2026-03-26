import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListingsService } from './listings.service';
import { ListingsController } from './listings.controller';
import { GroupListingsService } from './group-listings.service';
import { GroupListingsController } from './group-listings.controller';
import { Listing } from './entities/listing.entity';
import { GroupListing } from './entities/group-listing.entity';
import { UsersModule } from '../users/users.module';
import { ChatModule } from '../chat/chat.module';
import { EventsModule } from '../events/events.module';  // 👈 ДОБАВИТЬ

@Module({
  imports: [
    TypeOrmModule.forFeature([Listing, GroupListing]),
    UsersModule,
    forwardRef(() => ChatModule),
    EventsModule,  // 👈 ДОБАВИТЬ (без forwardRef)
  ],
  controllers: [ListingsController, GroupListingsController],
  providers: [ListingsService, GroupListingsService],
  exports: [ListingsService, GroupListingsService],
})
export class ListingsModule {}