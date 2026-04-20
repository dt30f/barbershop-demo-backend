import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

class WorkingHoursItemDto {
  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek!: number;

  @IsString()
  startTimeLocal!: string;

  @IsString()
  endTimeLocal!: string;

  @IsBoolean()
  isActive!: boolean;
}

export class ReplaceWorkingHoursDto {
  @IsArray()
  @ArrayMinSize(7)
  @ValidateNested({ each: true })
  @Type(() => WorkingHoursItemDto)
  items!: WorkingHoursItemDto[];
}
