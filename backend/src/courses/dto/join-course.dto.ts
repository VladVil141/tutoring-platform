import { IsString, IsNotEmpty } from 'class-validator';

export class JoinCourseDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}