import { IsDateString, IsOptional } from 'class-validator';

import { IsAppUuid } from '../../../common/validation/is-app-uuid.decorator';

export class GetAdminScheduleWeekQueryDto {
  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsAppUuid()
  barberId?: string;
}
