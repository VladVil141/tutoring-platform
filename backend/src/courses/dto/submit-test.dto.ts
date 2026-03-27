import { IsInt, IsNotEmpty, IsObject } from 'class-validator';

export class SubmitTestDto {
  @IsInt()
  @IsNotEmpty()
  test_id: number;

  @IsObject()
  answers: Record<string, string>;
}