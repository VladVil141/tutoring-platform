import { PartialType } from '@nestjs/mapped-types';
import { CreateGroupListingDto } from './create-group-listing.dto';

export class UpdateGroupListingDto extends PartialType(CreateGroupListingDto) {}