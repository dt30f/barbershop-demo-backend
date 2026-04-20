import { IsString } from 'class-validator';

export class CustomerLogoutDto {
  @IsString()
  refreshToken!: string;
}
