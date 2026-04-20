import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import {
  CurrentActorId,
  CurrentSalonId,
} from '../../common/request-context/request-context.decorators';
import { AdminDevAuthGuard } from '../../common/request-context/request-context.guards';

import { CreateAdminAppointmentDto } from './dto/create-admin-appointment.dto';
import { ListAdminAppointmentsQueryDto } from './dto/list-admin-appointments.query';
import { UpdateAdminAppointmentDto } from './dto/update-admin-appointment.dto';
import { AppointmentsService } from './appointments.service';
import {
  AdminAppointmentsSortBy,
  SortDirection,
} from './appointments.types';

@Controller('api/v1/admin/appointments')
@UseGuards(AdminDevAuthGuard)
export class AppointmentsAdminController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  listAdminAppointments(
    @CurrentSalonId() salonId: string,
    @Query() query: ListAdminAppointmentsQueryDto,
  ) {
    return this.appointmentsService.listAdminAppointments({
      salonId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      barberId: query.barberId,
      status: query.status,
      customerPhone: query.customerPhone,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      sortBy: query.sortBy ?? AdminAppointmentsSortBy.START_AT,
      sortDirection: query.sortDirection ?? SortDirection.ASC,
    });
  }

  @Post()
  createAdminAppointment(
    @CurrentSalonId() salonId: string,
    @CurrentActorId() adminUserId: string,
    @Body() body: CreateAdminAppointmentDto,
  ) {
    return this.appointmentsService.createAdminAppointment({
      salonId,
      adminUserId,
      customerPhoneNumber: body.customerPhoneNumber,
      customerFirstName: body.customerFirstName,
      customerLastName: body.customerLastName,
      barberId: body.barberId,
      barberServiceId: body.barberServiceId,
      startAt: body.startAt,
    });
  }

  @Patch(':appointmentId')
  updateAdminAppointment(
    @Param('appointmentId') appointmentId: string,
    @CurrentSalonId() salonId: string,
    @CurrentActorId() adminUserId: string,
    @Body() body: UpdateAdminAppointmentDto,
  ) {
    return this.appointmentsService.updateAdminAppointment({
      salonId,
      adminUserId,
      appointmentId,
      status: body.status,
      cancelReason: body.cancelReason,
    });
  }
}
