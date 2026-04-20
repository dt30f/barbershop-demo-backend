import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { CurrentSalonId } from '../../common/request-context/request-context.decorators';
import { AdminDevAuthGuard } from '../../common/request-context/request-context.guards';
import { GetAdminScheduleDayQueryDto } from './dto/get-admin-schedule-day.query';
import { GetAdminScheduleWeekQueryDto } from './dto/get-admin-schedule-week.query';
import { ScheduleService } from './schedule.service';

@Controller('api/v1/admin/schedule')
@UseGuards(AdminDevAuthGuard)
export class ScheduleDayController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get('day')
  getAdminScheduleDay(
    @CurrentSalonId() salonId: string,
    @Query() query: GetAdminScheduleDayQueryDto,
  ) {
    return this.scheduleService.getAdminScheduleDay({
      salonId,
      date: query.date,
      barberId: query.barberId,
    });
  }

  @Get('week')
  getAdminScheduleWeek(
    @CurrentSalonId() salonId: string,
    @Query() query: GetAdminScheduleWeekQueryDto,
  ) {
    return this.scheduleService.getAdminScheduleWeek({
      salonId,
      startDate: query.startDate,
      barberId: query.barberId,
    });
  }
}
