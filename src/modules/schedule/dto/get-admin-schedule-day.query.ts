import { IsDateString, IsOptional } from 'class-validator';

import { IsAppUuid } from '../../../common/validation/is-app-uuid.decorator';

export class GetAdminScheduleDayQueryDto {
  @IsDateString()
  date!: string;

  @IsOptional()
  @IsAppUuid()
  barberId?: string;
}
