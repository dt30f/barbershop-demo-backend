import { IsDateString } from 'class-validator';

export class GetBarberScheduleDayQueryDto {
  @IsDateString()
  date!: string;
}
