import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import {
  CurrentActorId,
  CurrentSalonId,
} from '../../common/request-context/request-context.decorators';
import { BarberDevAuthGuard } from '../../common/request-context/request-context.guards';
import { CreateBarberDayOffDto } from './dto/create-barber-day-off.dto';
import { CreateBlockedSlotDto } from './dto/create-blocked-slot.dto';
import { GetBarberScheduleDayQueryDto } from './dto/get-barber-schedule-day.query';
import { GetBarberScheduleWeekQueryDto } from './dto/get-barber-schedule-week.query';
import { ScheduleService } from './schedule.service';

@Controller('api/v1/barber')
@UseGuards(BarberDevAuthGuard)
export class ScheduleBarberController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get('schedule/day')
  getOwnScheduleDay(
    @CurrentSalonId() salonId: string,
    @CurrentActorId() barberId: string,
    @Query() query: GetBarberScheduleDayQueryDto,
  ) {
    return this.scheduleService.getBarberOwnScheduleDay({
      salonId,
      barberId,
      date: query.date,
    });
  }

  @Get('schedule/week')
  getOwnScheduleWeek(
    @CurrentSalonId() salonId: string,
    @CurrentActorId() barberId: string,
    @Query() query: GetBarberScheduleWeekQueryDto,
  ) {
    return this.scheduleService.getBarberOwnScheduleWeek({
      salonId,
      barberId,
      startDate: query.startDate,
    });
  }

  @Post('day-off')
  createOwnDayOff(
    @CurrentSalonId() salonId: string,
    @CurrentActorId() barberId: string,
    @Body() body: CreateBarberDayOffDto,
  ) {
    return this.scheduleService.createBarberOwnDayOff({
      salonId,
      barberId,
      dateLocal: body.dateLocal,
      reason: body.reason,
    });
  }

  @Delete('day-off/:dayOffId')
  deleteOwnDayOff(
    @CurrentSalonId() salonId: string,
    @CurrentActorId() barberId: string,
    @Param('dayOffId') dayOffId: string,
  ) {
    return this.scheduleService.deleteBarberOwnDayOff({
      salonId,
      barberId,
      dayOffId,
    });
  }

  @Post('blocked-slots')
  createOwnBlockedSlot(
    @CurrentSalonId() salonId: string,
    @CurrentActorId() barberId: string,
    @Body() body: CreateBlockedSlotDto,
  ) {
    return this.scheduleService.createBarberOwnBlockedSlot({
      salonId,
      barberId,
      startAt: body.startAt,
      endAt: body.endAt,
      reasonType: body.reasonType,
      note: body.note,
    });
  }

  @Delete('blocked-slots/:blockedSlotId')
  deleteOwnBlockedSlot(
    @CurrentSalonId() salonId: string,
    @CurrentActorId() barberId: string,
    @Param('blockedSlotId') blockedSlotId: string,
  ) {
    return this.scheduleService.deleteBarberOwnBlockedSlot({
      salonId,
      barberId,
      blockedSlotId,
    });
  }
}
