import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateSalonSettingsDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  brandName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsIn([15, 30, 60])
  slotGranularityMinutes?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
