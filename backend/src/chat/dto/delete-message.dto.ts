import { IsInt, IsBoolean, IsOptional } from 'class-validator';

export class DeleteMessageDto {
  @IsInt()
  message_id: number;

  @IsOptional()
  @IsBoolean()
  delete_for_both?: boolean; // для личного чата

  @IsOptional()
  @IsBoolean()
  delete_for_all?: boolean; // для группового

  @IsOptional()
  @IsInt()
  delete_for_user_id?: number; // для кого удалить в группе
}