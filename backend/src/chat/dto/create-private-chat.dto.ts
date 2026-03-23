import { IsInt } from 'class-validator';

export class CreatePrivateChatDto {
  @IsInt()
  tutor_id: number;
}