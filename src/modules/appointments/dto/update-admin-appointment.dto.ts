import { IsIn, IsOptional, IsString } from 'class-validator';

import { AppointmentStatus } from '../appointments.enums';

export class UpdateAdminAppointmentDto {
  @IsIn([
    AppointmentStatus.CANCELLED,
    AppointmentStatus.COMPLETED,
    AppointmentStatus.NO_SHOW,
  ])
  status!:
    | AppointmentStatus.CANCELLED
    | AppointmentStatus.COMPLETED
    | AppointmentStatus.NO_SHOW;

  @IsOptional()
  @IsString()
  cancelReason?: string;
}
