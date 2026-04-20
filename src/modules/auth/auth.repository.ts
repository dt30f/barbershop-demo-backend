import { Injectable, NotImplementedException } from '@nestjs/common';

export type CustomerAuthProfile = {
  id: string;
  phoneNumber: string;
  firstName?: string | null;
  lastName?: string | null;
};

export type CustomerSessionRecord = {
  id: string;
  customerId: string;
  expiresAt: string;
  revokedAt?: string | null;
};

export type StaffAuthProfile = {
  id: string;
  email: string;
  passwordHash: string;
  firstName?: string | null;
  lastName?: string | null;
  role: 'ADMIN' | 'BARBER';
  barberId?: string | null;
  isActive: boolean;
};

export type StaffSessionRecord = {
  id: string;
  adminUserId: string;
  expiresAt: string;
  revokedAt?: string | null;
};

export abstract class AuthRepository {
  abstract findOrCreateCustomerByPhone(input: {
    salonId: string;
    phoneNumber: string;
    firstName?: string;
    lastName?: string;
  }): Promise<CustomerAuthProfile>;

  abstract findCustomerById(
    salonId: string,
    customerId: string,
  ): Promise<CustomerAuthProfile | null>;

  abstract createCustomerSession(input: {
    salonId: string;
    customerId: string;
    refreshTokenHash: string;
    expiresAt: string;
    deviceInfo?: string;
  }): Promise<void>;

  abstract findActiveCustomerSessionByTokenHash(input: {
    salonId: string;
    refreshTokenHash: string;
  }): Promise<CustomerSessionRecord | null>;

  abstract rotateCustomerSession(input: {
    sessionId: string;
    refreshTokenHash: string;
    expiresAt: string;
  }): Promise<void>;

  abstract revokeCustomerSessionByTokenHash(input: {
    salonId: string;
    refreshTokenHash: string;
    revokedAt: string;
  }): Promise<void>;

  abstract findStaffByEmail(
    salonId: string,
    email: string,
  ): Promise<StaffAuthProfile | null>;

  abstract findStaffById(
    salonId: string,
    staffId: string,
  ): Promise<StaffAuthProfile | null>;

  abstract createStaffSession(input: {
    salonId: string;
    adminUserId: string;
    refreshTokenHash: string;
    expiresAt: string;
    deviceInfo?: string;
  }): Promise<void>;

  abstract findActiveStaffSessionByTokenHash(input: {
    salonId: string;
    refreshTokenHash: string;
  }): Promise<StaffSessionRecord | null>;

  abstract rotateStaffSession(input: {
    sessionId: string;
    refreshTokenHash: string;
    expiresAt: string;
  }): Promise<void>;

  abstract revokeStaffSessionByTokenHash(input: {
    salonId: string;
    refreshTokenHash: string;
    revokedAt: string;
  }): Promise<void>;
}

@Injectable()
export class UnconfiguredAuthRepository implements AuthRepository {
  async findOrCreateCustomerByPhone(_input: {
    salonId: string;
    phoneNumber: string;
    firstName?: string;
    lastName?: string;
  }): Promise<CustomerAuthProfile> {
    throw new NotImplementedException(
      'AuthRepository is not wired to a real data source yet.',
    );
  }

  async findCustomerById(
    _salonId: string,
    _customerId: string,
  ): Promise<CustomerAuthProfile | null> {
    throw new NotImplementedException(
      'AuthRepository is not wired to a real data source yet.',
    );
  }

  async createCustomerSession(_input: {
    salonId: string;
    customerId: string;
    refreshTokenHash: string;
    expiresAt: string;
    deviceInfo?: string;
  }): Promise<void> {
    throw new NotImplementedException(
      'AuthRepository is not wired to a real data source yet.',
    );
  }

  async findActiveCustomerSessionByTokenHash(_input: {
    salonId: string;
    refreshTokenHash: string;
  }): Promise<CustomerSessionRecord | null> {
    throw new NotImplementedException(
      'AuthRepository is not wired to a real data source yet.',
    );
  }

  async rotateCustomerSession(_input: {
    sessionId: string;
    refreshTokenHash: string;
    expiresAt: string;
  }): Promise<void> {
    throw new NotImplementedException(
      'AuthRepository is not wired to a real data source yet.',
    );
  }

  async revokeCustomerSessionByTokenHash(_input: {
    salonId: string;
    refreshTokenHash: string;
    revokedAt: string;
  }): Promise<void> {
    throw new NotImplementedException(
      'AuthRepository is not wired to a real data source yet.',
    );
  }

  async findStaffByEmail(
    _salonId: string,
    _email: string,
  ): Promise<StaffAuthProfile | null> {
    throw new NotImplementedException(
      'AuthRepository is not wired to a real data source yet.',
    );
  }

  async findStaffById(
    _salonId: string,
    _staffId: string,
  ): Promise<StaffAuthProfile | null> {
    throw new NotImplementedException(
      'AuthRepository is not wired to a real data source yet.',
    );
  }

  async createStaffSession(_input: {
    salonId: string;
    adminUserId: string;
    refreshTokenHash: string;
    expiresAt: string;
    deviceInfo?: string;
  }): Promise<void> {
    throw new NotImplementedException(
      'AuthRepository is not wired to a real data source yet.',
    );
  }

  async findActiveStaffSessionByTokenHash(_input: {
    salonId: string;
    refreshTokenHash: string;
  }): Promise<StaffSessionRecord | null> {
    throw new NotImplementedException(
      'AuthRepository is not wired to a real data source yet.',
    );
  }

  async rotateStaffSession(_input: {
    sessionId: string;
    refreshTokenHash: string;
    expiresAt: string;
  }): Promise<void> {
    throw new NotImplementedException(
      'AuthRepository is not wired to a real data source yet.',
    );
  }

  async revokeStaffSessionByTokenHash(_input: {
    salonId: string;
    refreshTokenHash: string;
    revokedAt: string;
  }): Promise<void> {
    throw new NotImplementedException(
      'AuthRepository is not wired to a real data source yet.',
    );
  }
}
