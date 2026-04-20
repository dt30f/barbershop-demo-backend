import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateBarberDayOffDto {
  @IsDateString()
  dateLocal!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
