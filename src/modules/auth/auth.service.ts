import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { AuthTokenService } from '../../common/auth-tokens/auth-token.service';
import {
  AuthRepository,
  CustomerAuthProfile,
  StaffAuthProfile,
} from './auth.repository';
import {
  CustomerAuthResult,
  CustomerProfileResult,
  StaffAuthResult,
} from './auth.types';

const bcrypt: {
  compare(value: string, hash: string): Promise<boolean>;
} = require('bcryptjs');

function getCustomerRefreshExpirationDate(): string {
  return new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString();
}

function getStaffRefreshExpirationDate(): string {
  return new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString();
}

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly authTokenService: AuthTokenService,
  ) {}

  async loginCustomer(input: {
    salonId: string;
    phoneNumber: string;
    firstName?: string;
    lastName?: string;
  }): Promise<CustomerAuthResult> {
    const customer = await this.authRepository.findOrCreateCustomerByPhone(input);

    return this.issueCustomerSession(input.salonId, customer);
  }

  async refreshCustomerSession(input: {
    salonId: string;
    refreshToken: string;
  }): Promise<CustomerAuthResult> {
    const payload = this.authTokenService.verifyRefreshToken(input.refreshToken);

    if (payload.role !== 'CUSTOMER') {
      throw new UnauthorizedException('Refresh token role is invalid.');
    }

    if (payload.salonId !== input.salonId) {
      throw new UnauthorizedException('Refresh token salon does not match.');
    }

    const refreshTokenHash =
      this.authTokenService.hashRefreshToken(input.refreshToken);

    const session =
      await this.authRepository.findActiveCustomerSessionByTokenHash({
        salonId: input.salonId,
        refreshTokenHash,
      });

    if (!session || session.customerId !== payload.sub) {
      throw new UnauthorizedException('Refresh session is invalid.');
    }

    const customer = await this.authRepository.findCustomerById(
      input.salonId,
      payload.sub,
    );

    if (!customer) {
      throw new NotFoundException('Customer nije pronadjen.');
    }

    const accessToken = this.authTokenService.signAccessToken({
      sub: customer.id,
      salonId: input.salonId,
      role: 'CUSTOMER',
      expiresInSeconds: 60 * 60,
    });
    const refreshToken = this.authTokenService.signRefreshToken({
      sub: customer.id,
      salonId: input.salonId,
      role: 'CUSTOMER',
      expiresInSeconds: 30 * 24 * 60 * 60,
    });

    await this.authRepository.rotateCustomerSession({
      sessionId: session.id,
      refreshTokenHash: this.authTokenService.hashRefreshToken(refreshToken),
      expiresAt: getCustomerRefreshExpirationDate(),
    });

    return {
      accessToken,
      refreshToken,
      customer,
    };
  }

  async getCustomerProfile(
    salonId: string,
    customerId: string,
  ): Promise<CustomerProfileResult> {
    const customer = await this.authRepository.findCustomerById(salonId, customerId);

    if (!customer) {
      throw new NotFoundException('Customer nije pronadjen.');
    }

    return customer;
  }

  async logoutCustomer(input: {
    salonId: string;
    refreshToken: string;
  }): Promise<{ success: true }> {
    const payload = this.authTokenService.verifyRefreshToken(input.refreshToken);

    if (payload.role !== 'CUSTOMER') {
      throw new UnauthorizedException('Refresh token role is invalid.');
    }

    if (payload.salonId !== input.salonId) {
      throw new UnauthorizedException('Refresh token salon does not match.');
    }

    await this.authRepository.revokeCustomerSessionByTokenHash({
      salonId: input.salonId,
      refreshTokenHash: this.authTokenService.hashRefreshToken(
        input.refreshToken,
      ),
      revokedAt: new Date().toISOString(),
    });

    return { success: true };
  }

  async loginStaff(input: {
    salonId: string;
    email: string;
    password: string;
  }): Promise<StaffAuthResult> {
    const staff = await this.authRepository.findStaffByEmail(
      input.salonId,
      input.email,
    );

    if (!staff || !staff.isActive) {
      throw new UnauthorizedException('Pogresni login podaci.');
    }

    const passwordMatches = await bcrypt.compare(input.password, staff.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException('Pogresni login podaci.');
    }

    return this.issueStaffSession(input.salonId, staff);
  }

  async refreshStaffSession(input: {
    salonId: string;
    refreshToken: string;
  }): Promise<StaffAuthResult> {
    const payload = this.authTokenService.verifyRefreshToken(input.refreshToken);

    if (!['ADMIN', 'BARBER'].includes(payload.role)) {
      throw new UnauthorizedException('Refresh token role is invalid.');
    }

    if (payload.salonId !== input.salonId) {
      throw new UnauthorizedException('Refresh token salon does not match.');
    }

    const refreshTokenHash =
      this.authTokenService.hashRefreshToken(input.refreshToken);

    const session = await this.authRepository.findActiveStaffSessionByTokenHash({
      salonId: input.salonId,
      refreshTokenHash,
    });

    if (!session || session.adminUserId !== payload.sub) {
      throw new UnauthorizedException('Refresh session is invalid.');
    }

    const staff = await this.authRepository.findStaffById(input.salonId, payload.sub);

    if (!staff || !staff.isActive) {
      throw new UnauthorizedException('Staff nije dostupan.');
    }

    const refreshToken = this.authTokenService.signRefreshToken({
      sub: staff.id,
      salonId: input.salonId,
      role: staff.role,
      expiresInSeconds: 30 * 24 * 60 * 60,
    });

    await this.authRepository.rotateStaffSession({
      sessionId: session.id,
      refreshTokenHash: this.authTokenService.hashRefreshToken(refreshToken),
      expiresAt: getStaffRefreshExpirationDate(),
    });

    return {
      ...(await this.buildStaffAuthResult(input.salonId, staff)),
      refreshToken,
    };
  }

  async logoutStaff(input: {
    salonId: string;
    refreshToken: string;
  }): Promise<{ success: true }> {
    const payload = this.authTokenService.verifyRefreshToken(input.refreshToken);

    if (!['ADMIN', 'BARBER'].includes(payload.role)) {
      throw new UnauthorizedException('Refresh token role is invalid.');
    }

    if (payload.salonId !== input.salonId) {
      throw new UnauthorizedException('Refresh token salon does not match.');
    }

    await this.authRepository.revokeStaffSessionByTokenHash({
      salonId: input.salonId,
      refreshTokenHash: this.authTokenService.hashRefreshToken(
        input.refreshToken,
      ),
      revokedAt: new Date().toISOString(),
    });

    return { success: true };
  }

  private async issueStaffSession(
    salonId: string,
    staff: StaffAuthProfile,
  ): Promise<StaffAuthResult> {
    const refreshToken = this.authTokenService.signRefreshToken({
      sub: staff.id,
      salonId,
      role: staff.role,
      expiresInSeconds: 30 * 24 * 60 * 60,
    });

    await this.authRepository.createStaffSession({
      salonId,
      adminUserId: staff.id,
      refreshTokenHash: this.authTokenService.hashRefreshToken(refreshToken),
      expiresAt: getStaffRefreshExpirationDate(),
      deviceInfo: this.authTokenService.generateOpaqueDeviceInfo(),
    });

    return {
      ...(await this.buildStaffAuthResult(salonId, staff)),
      refreshToken,
    };
  }

  private async buildStaffAuthResult(
    salonId: string,
    staff: StaffAuthProfile,
  ): Promise<Omit<StaffAuthResult, 'refreshToken'>> {
    const actorId =
      staff.role === 'BARBER' ? (staff.barberId ?? staff.id) : staff.id;

    return {
      accessToken: this.authTokenService.signAccessToken({
        sub: staff.id,
        actorId,
        salonId,
        role: staff.role,
        expiresInSeconds: 12 * 60 * 60,
      }),
      staff: {
        id: staff.id,
        email: staff.email,
        firstName: staff.firstName,
        lastName: staff.lastName,
        role: staff.role,
        barberId: staff.barberId,
      },
    };
  }

  private async issueCustomerSession(
    salonId: string,
    customer: CustomerAuthProfile,
  ): Promise<CustomerAuthResult> {
    const accessToken = this.authTokenService.signAccessToken({
      sub: customer.id,
      salonId,
      role: 'CUSTOMER',
      expiresInSeconds: 60 * 60,
    });
    const refreshToken = this.authTokenService.signRefreshToken({
      sub: customer.id,
      salonId,
      role: 'CUSTOMER',
      expiresInSeconds: 30 * 24 * 60 * 60,
    });

    await this.authRepository.createCustomerSession({
      salonId,
      customerId: customer.id,
      refreshTokenHash: this.authTokenService.hashRefreshToken(refreshToken),
      expiresAt: getCustomerRefreshExpirationDate(),
      deviceInfo: this.authTokenService.generateOpaqueDeviceInfo(),
    });

    return {
      accessToken,
      refreshToken,
      customer,
    };
  }
}
