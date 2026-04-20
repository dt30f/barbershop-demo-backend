import { IsString } from 'class-validator';

export class StaffLogoutDto {
  @IsString()
  refreshToken!: string;
}
