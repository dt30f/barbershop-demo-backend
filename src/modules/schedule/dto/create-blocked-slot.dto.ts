import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

import { BlockedSlotReasonType } from '../schedule.enums';

export class CreateBlockedSlotDto {
  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsEnum(BlockedSlotReasonType)
  reasonType!: BlockedSlotReasonType;

  @IsOptional()
  @IsString()
  note?: string;
}
