import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import {
  CurrentActorId,
  CurrentSalonId,
} from '../../common/request-context/request-context.decorators';
import { BarberDevAuthGuard } from '../../common/request-context/request-context.guards';

import { CreateBarberAppointmentDto } from './dto/create-barber-appointment.dto';
import { AppointmentsService } from './appointments.service';

@Controller('api/v1/barber/appointments')
@UseGuards(BarberDevAuthGuard)
export class AppointmentsBarberController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  createBarberAppointment(
    @CurrentSalonId() salonId: string,
    @CurrentActorId() barberId: string,
    @Body() body: CreateBarberAppointmentDto,
  ) {
    return this.appointmentsService.createBarberAppointment({
      salonId,
      barberId,
      customerPhoneNumber: body.customerPhoneNumber,
      customerFirstName: body.customerFirstName,
      customerLastName: body.customerLastName,
      barberServiceId: body.barberServiceId,
      startAt: body.startAt,
    });
  }
}
