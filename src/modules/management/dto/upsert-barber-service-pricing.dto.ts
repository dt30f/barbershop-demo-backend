import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

import { IsAppUuid } from '../../../common/validation/is-app-uuid.decorator';

class BarberServicePricingItemDto {
  @IsAppUuid()
  barberId!: string;

  @IsAppUuid()
  serviceId!: string;

  @Type(() => Number)
  @Min(0)
  priceAmount!: number;

  @IsString()
  currency!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationOverrideMinutes?: number | null;

  @IsBoolean()
  isActive!: boolean;
}

export class UpsertBarberServicePricingDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BarberServicePricingItemDto)
  items!: BarberServicePricingItemDto[];
}
