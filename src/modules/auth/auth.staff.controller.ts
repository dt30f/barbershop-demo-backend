import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import { CurrentSalonId } from '../../common/request-context/request-context.decorators';
import { WhiteLabelSalonGuard } from '../../common/request-context/request-context.guards';
import { StaffLogoutDto } from './dto/staff-logout.dto';
import { StaffLoginDto } from './dto/staff-login.dto';
import { StaffRefreshDto } from './dto/staff-refresh.dto';
import { AuthService } from './auth.service';

@Controller('api/v1/auth/staff')
export class AuthStaffController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @UseGuards(WhiteLabelSalonGuard)
  loginStaff(@CurrentSalonId() salonId: string, @Body() body: StaffLoginDto) {
    return this.authService.loginStaff({
      salonId,
      email: body.email,
      password: body.password,
    });
  }

  @Post('refresh')
  @UseGuards(WhiteLabelSalonGuard)
  refreshStaffSession(
    @CurrentSalonId() salonId: string,
    @Body() body: StaffRefreshDto,
  ) {
    return this.authService.refreshStaffSession({
      salonId,
      refreshToken: body.refreshToken,
    });
  }

  @Post('logout')
  @UseGuards(WhiteLabelSalonGuard)
  logoutStaff(@CurrentSalonId() salonId: string, @Body() body: StaffLogoutDto) {
    return this.authService.logoutStaff({
      salonId,
      refreshToken: body.refreshToken,
    });
  }
}
