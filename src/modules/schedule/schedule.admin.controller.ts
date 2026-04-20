import { Body, Controller, Delete, Param, Post, UseGuards } from '@nestjs/common';

import {
  CurrentActorId,
  CurrentSalonId,
} from '../../common/request-context/request-context.decorators';
import { AdminDevAuthGuard } from '../../common/request-context/request-context.guards';
import { CreateBarberDayOffDto } from './dto/create-barber-day-off.dto';
import { CreateBlockedSlotDto } from './dto/create-blocked-slot.dto';
import { ScheduleService } from './schedule.service';

@Controller('api/v1/admin/barbers/:barberId')
@UseGuards(AdminDevAuthGuard)
export class ScheduleAdminController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Post('day-off')
  createBarberDayOff(
    @CurrentSalonId() salonId: string,
    @CurrentActorId() adminUserId: string,
    @Param('barberId') barberId: string,
    @Body() body: CreateBarberDayOffDto,
  ) {
    return this.scheduleService.createAdminBarberDayOff({
      salonId,
      adminUserId,
      barberId,
      dateLocal: body.dateLocal,
      reason: body.reason,
    });
  }

  @Delete('day-off/:dayOffId')
  deleteBarberDayOff(
    @CurrentSalonId() salonId: string,
    @Param('barberId') barberId: string,
    @Param('dayOffId') dayOffId: string,
  ) {
    return this.scheduleService.deleteAdminBarberDayOff({
      salonId,
      barberId,
      dayOffId,
    });
  }

  @Post('blocked-slots')
  createBlockedSlot(
    @CurrentSalonId() salonId: string,
    @CurrentActorId() adminUserId: string,
    @Param('barberId') barberId: string,
    @Body() body: CreateBlockedSlotDto,
  ) {
    return this.scheduleService.createAdminBlockedSlot({
      salonId,
      adminUserId,
      barberId,
      startAt: body.startAt,
      endAt: body.endAt,
      reasonType: body.reasonType,
      note: body.note,
    });
  }

  @Delete('blocked-slots/:blockedSlotId')
  deleteBlockedSlot(
    @CurrentSalonId() salonId: string,
    @Param('barberId') barberId: string,
    @Param('blockedSlotId') blockedSlotId: string,
  ) {
    return this.scheduleService.deleteAdminBlockedSlot({
      salonId,
      barberId,
      blockedSlotId,
    });
  }
}
