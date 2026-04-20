import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';

import {
  CurrentSalonId,
} from '../../common/request-context/request-context.decorators';
import { AdminDevAuthGuard } from '../../common/request-context/request-context.guards';
import { IsAppUuid } from '../../common/validation/is-app-uuid.decorator';
import { CreateBarberDto } from './dto/create-barber.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { ReplaceWorkingHoursDto } from './dto/replace-working-hours.dto';
import { UpdateBarberDto } from './dto/update-barber.dto';
import { UpdateSalonSettingsDto } from './dto/update-salon-settings.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { UpsertBarberServicePricingDto } from './dto/upsert-barber-service-pricing.dto';
import { ManagementService } from './management.service';

class EntityParamDto {
  @IsAppUuid()
  id!: string;
}

@Controller('api/v1/admin')
@UseGuards(AdminDevAuthGuard)
export class ManagementController {
  constructor(private readonly managementService: ManagementService) {}

  @Get('barbers')
  listBarbers(@CurrentSalonId() salonId: string) {
    return this.managementService.listBarbers(salonId);
  }

  @Post('barbers')
  createBarber(
    @CurrentSalonId() salonId: string,
    @Body() body: CreateBarberDto,
  ) {
    return this.managementService.createBarber({
      salonId,
      ...body,
    });
  }

  @Patch('barbers/:id')
  updateBarber(
    @CurrentSalonId() salonId: string,
    @Param() params: EntityParamDto,
    @Body() body: UpdateBarberDto,
  ) {
    return this.managementService.updateBarber({
      salonId,
      barberId: params.id,
      ...body,
    });
  }

  @Get('services')
  listServices(@CurrentSalonId() salonId: string) {
    return this.managementService.listServices(salonId);
  }

  @Post('services')
  createService(
    @CurrentSalonId() salonId: string,
    @Body() body: CreateServiceDto,
  ) {
    return this.managementService.createService({
      salonId,
      ...body,
    });
  }

  @Patch('services/:id')
  updateService(
    @CurrentSalonId() salonId: string,
    @Param() params: EntityParamDto,
    @Body() body: UpdateServiceDto,
  ) {
    return this.managementService.updateService({
      salonId,
      serviceId: params.id,
      ...body,
    });
  }

  @Get('barber-services')
  listBarberServicePricing(@CurrentSalonId() salonId: string) {
    return this.managementService.listBarberServicePricing(salonId);
  }

  @Put('barber-services')
  upsertBarberServicePricing(
    @CurrentSalonId() salonId: string,
    @Body() body: UpsertBarberServicePricingDto,
  ) {
    return this.managementService.upsertBarberServicePricing({
      salonId,
      items: body.items,
    });
  }

  @Get('settings/salon')
  getSalonSettings(@CurrentSalonId() salonId: string) {
    return this.managementService.getSalonSettings(salonId);
  }

  @Put('settings/salon')
  updateSalonSettings(
    @CurrentSalonId() salonId: string,
    @Body() body: UpdateSalonSettingsDto,
  ) {
    return this.managementService.updateSalonSettings({
      salonId,
      ...body,
    });
  }

  @Get('settings/working-hours')
  listWorkingHours(@CurrentSalonId() salonId: string) {
    return this.managementService.listWorkingHours(salonId);
  }

  @Put('settings/working-hours')
  replaceWorkingHours(
    @CurrentSalonId() salonId: string,
    @Body() body: ReplaceWorkingHoursDto,
  ) {
    return this.managementService.replaceWorkingHours({
      salonId,
      items: body.items,
    });
  }
}
