import { Controller, Get, Param, UseGuards } from '@nestjs/common';

import { CurrentSalonId } from '../../common/request-context/request-context.decorators';
import { WhiteLabelSalonGuard } from '../../common/request-context/request-context.guards';
import { ManagementService } from './management.service';

@Controller('api/v1/public')
@UseGuards(WhiteLabelSalonGuard)
export class ManagementPublicController {
  constructor(private readonly managementService: ManagementService) {}

  @Get('barbers')
  listPublicBarbers(@CurrentSalonId() salonId: string) {
    return this.managementService.listPublicBarbers(salonId);
  }

  @Get('barbers/:barberId')
  getPublicBarberDetail(
    @CurrentSalonId() salonId: string,
    @Param('barberId') barberId: string,
  ) {
    return this.managementService.getPublicBarberDetail(salonId, barberId);
  }

  @Get('salon')
  getPublicSalonContact(@CurrentSalonId() salonId: string) {
    return this.managementService.getPublicSalonContact(salonId);
  }
}
