import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';

import {
  CurrentSalonId,
} from '../../common/request-context/request-context.decorators';
import { WhiteLabelSalonGuard } from '../../common/request-context/request-context.guards';

import { GetBarberAvailabilityQueryDto } from './dto/get-barber-availability.query';
import { AvailabilityService } from './availability.service';

@Controller('api/v1/public/barbers')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get(':barberId/availability')
  @UseGuards(WhiteLabelSalonGuard)
  getBarberAvailability(
    @Param('barberId') barberId: string,
    @CurrentSalonId() salonId: string,
    @Query() query: GetBarberAvailabilityQueryDto,
  ) {
    return this.availabilityService.getBarberAvailability({
      salonId,
      barberId,
      barberServiceId: query.barberServiceId,
      date: query.date,
    });
  }
}
