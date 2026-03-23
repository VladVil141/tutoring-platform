import { IsString, IsEnum, IsInt, IsOptional, MinLength, MaxLength } from 'class-validator';

export enum ChatType {
  PRIVATE = 'private',
  GROUP = 'group'
}

export class SendMessageDto {
  @IsEnum(ChatType)
  chat_type: ChatType;

  @IsInt()
  chat_id: number;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text: string;
}