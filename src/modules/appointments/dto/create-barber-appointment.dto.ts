import { IsDateString, IsOptional, IsString } from 'class-validator';

import { IsAppUuid } from '../../../common/validation/is-app-uuid.decorator';

export class CreateBarberAppointmentDto {
  @IsString()
  customerPhoneNumber!: string;

  @IsString()
  customerFirstName!: string;

  @IsOptional()
  @IsString()
  customerLastName?: string;

  @IsAppUuid()
  barberServiceId!: string;

  @IsDateString()
  startAt!: string;
}
