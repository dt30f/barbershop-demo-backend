import { IsDateString } from 'class-validator';

import { IsAppUuid } from '../../../common/validation/is-app-uuid.decorator';

export class GetBarberAvailabilityQueryDto {
  @IsDateString()
  date!: string;

  @IsAppUuid()
  barberServiceId!: string;
}
