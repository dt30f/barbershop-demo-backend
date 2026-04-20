import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import { IsAppUuid } from '../../../common/validation/is-app-uuid.decorator';
import { AppointmentStatus } from '../appointments.enums';
import {
  AdminAppointmentsSortBy,
  SortDirection,
} from '../appointments.types';

export class ListAdminAppointmentsQueryDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsAppUuid()
  barberId?: string;

  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsEnum(AdminAppointmentsSortBy)
  sortBy?: AdminAppointmentsSortBy;

  @IsOptional()
  @IsEnum(SortDirection)
  sortDirection?: SortDirection;
}
