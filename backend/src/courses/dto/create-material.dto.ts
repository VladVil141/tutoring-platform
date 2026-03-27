import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class CreateMaterialDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsInt()
  @Min(1)
  section_id: number;
}