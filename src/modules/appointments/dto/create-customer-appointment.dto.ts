import { IsDateString } from 'class-validator';

import { IsAppUuid } from '../../../common/validation/is-app-uuid.decorator';

export class CreateCustomerAppointmentDto {
  @IsAppUuid()
  barberId!: string;

  @IsAppUuid()
  barberServiceId!: string;

  @IsDateString()
  startAt!: string;
}
