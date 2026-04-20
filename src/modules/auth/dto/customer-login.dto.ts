import { IsOptional, IsString } from 'class-validator';

export class CustomerLoginDto {
  @IsString()
  phoneNumber!: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;
}
