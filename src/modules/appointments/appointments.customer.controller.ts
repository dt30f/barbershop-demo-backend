import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';

import {
  CurrentActorId,
  CurrentSalonId,
} from '../../common/request-context/request-context.decorators';
import { CustomerDevAuthGuard } from '../../common/request-context/request-context.guards';

import { CreateCustomerAppointmentDto } from './dto/create-customer-appointment.dto';
import { AppointmentsService } from './appointments.service';

@Controller('api/v1/customer/appointments')
@UseGuards(CustomerDevAuthGuard)
export class AppointmentsCustomerController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  listCustomerAppointments(
    @CurrentSalonId() salonId: string,
    @CurrentActorId() customerId: string,
  ) {
    return this.appointmentsService.listCustomerFutureAppointments(
      salonId,
      customerId,
    );
  }

  @Post()
  createCustomerAppointment(
    @CurrentSalonId() salonId: string,
    @CurrentActorId() customerId: string,
    @Body() body: CreateCustomerAppointmentDto,
  ) {
    return this.appointmentsService.createCustomerAppointment({
      salonId,
      customerId,
      barberId: body.barberId,
      barberServiceId: body.barberServiceId,
      startAt: body.startAt,
    });
  }

  @Post(':appointmentId/cancel')
  cancelCustomerAppointment(
    @Param('appointmentId') appointmentId: string,
    @CurrentSalonId() salonId: string,
    @CurrentActorId() customerId: string,
  ) {
    return this.appointmentsService.cancelCustomerAppointment(
      salonId,
      customerId,
      appointmentId,
    );
  }
}
