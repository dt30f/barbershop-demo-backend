import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateBarberDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsString()
  displayName!: string;

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsBoolean()
  isActive!: boolean;

  @IsInt()
  @Min(0)
  displayOrder!: number;
}
