import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import {
  CurrentActorId,
  CurrentSalonId,
} from '../../common/request-context/request-context.decorators';
import {
  CustomerDevAuthGuard,
  WhiteLabelSalonGuard,
} from '../../common/request-context/request-context.guards';
import { CustomerLoginDto } from './dto/customer-login.dto';
import { CustomerLogoutDto } from './dto/customer-logout.dto';
import { CustomerRefreshDto } from './dto/customer-refresh.dto';
import { AuthService } from './auth.service';

@Controller('api/v1/auth/customer')
export class AuthCustomerController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @UseGuards(WhiteLabelSalonGuard)
  loginCustomer(
    @CurrentSalonId() salonId: string,
    @Body() body: CustomerLoginDto,
  ) {
    return this.authService.loginCustomer({
      salonId,
      phoneNumber: body.phoneNumber,
      firstName: body.firstName,
      lastName: body.lastName,
    });
  }

  @Post('refresh')
  @UseGuards(WhiteLabelSalonGuard)
  refreshCustomerSession(
    @CurrentSalonId() salonId: string,
    @Body() body: CustomerRefreshDto,
  ) {
    return this.authService.refreshCustomerSession({
      salonId,
      refreshToken: body.refreshToken,
    });
  }

  @Post('logout')
  @UseGuards(WhiteLabelSalonGuard)
  logoutCustomer(
    @CurrentSalonId() salonId: string,
    @Body() body: CustomerLogoutDto,
  ) {
    return this.authService.logoutCustomer({
      salonId,
      refreshToken: body.refreshToken,
    });
  }

  @Get('me')
  @UseGuards(CustomerDevAuthGuard)
  getCustomerProfile(
    @CurrentSalonId() salonId: string,
    @CurrentActorId() customerId: string,
  ) {
    return this.authService.getCustomerProfile(salonId, customerId);
  }
}
