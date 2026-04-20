import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateServiceDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(1)
  durationMinutes!: number;

  @IsBoolean()
  isActive!: boolean;

  @IsInt()
  @Min(0)
  displayOrder!: number;
}
