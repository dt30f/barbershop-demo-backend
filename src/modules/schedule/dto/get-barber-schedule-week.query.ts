import { IsDateString } from 'class-validator';

export class GetBarberScheduleWeekQueryDto {
  @IsDateString()
  startDate!: string;
}
