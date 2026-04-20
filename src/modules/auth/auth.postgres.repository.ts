import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';

import { DATABASE_POOL } from '../../database/database.constants';
import {
  AuthRepository,
  CustomerAuthProfile,
  CustomerSessionRecord,
  StaffAuthProfile,
  StaffSessionRecord,
} from './auth.repository';

type CustomerRow = {
  id: string;
  phone_number: string;
  first_name: string | null;
  last_name: string | null;
};

type CustomerSessionRow = {
  id: string;
  customer_id: string;
  expires_at: string | Date;
  revoked_at: string | Date | null;
};

type StaffSessionRow = {
  id: string;
  admin_user_id: string;
  expires_at: string | Date;
  revoked_at: string | Date | null;
};

type StaffRow = {
  id: string;
  email: string;
  password_hash: string;
  first_name: string | null;
  last_name: string | null;
  role: 'ADMIN' | 'BARBER';
  barber_id: string | null;
  is_active: boolean;
};

function toIsoString(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

@Injectable()
export class PostgresAuthRepository extends AuthRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {
    super();
  }

  async findOrCreateCustomerByPhone(input: {
    salonId: string;
    phoneNumber: string;
    firstName?: string;
    lastName?: string;
  }): Promise<CustomerAuthProfile> {
    const result = await this.pool.query<CustomerRow>(
      `
        insert into customer (
          salon_id,
          phone_number,
          first_name,
          last_name
        )
        values ($1, $2, $3, $4)
        on conflict (salon_id, phone_number)
        do update
        set
          first_name = coalesce(customer.first_name, excluded.first_name),
          last_name = coalesce(customer.last_name, excluded.last_name)
        returning
          id,
          phone_number,
          first_name,
          last_name
      `,
      [
        input.salonId,
        input.phoneNumber,
        input.firstName ?? null,
        input.lastName ?? null,
      ],
    );

    const row = result.rows[0];

    return {
      id: row.id,
      phoneNumber: row.phone_number,
      firstName: row.first_name,
      lastName: row.last_name,
    };
  }

  async findCustomerById(
    salonId: string,
    customerId: string,
  ): Promise<CustomerAuthProfile | null> {
    const result = await this.pool.query<CustomerRow>(
      `
        select
          id,
          phone_number,
          first_name,
          last_name
        from customer
        where salon_id = $1
          and id = $2
        limit 1
      `,
      [salonId, customerId],
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      phoneNumber: row.phone_number,
      firstName: row.first_name,
      lastName: row.last_name,
    };
  }

  async createCustomerSession(input: {
    salonId: string;
    customerId: string;
    refreshTokenHash: string;
    expiresAt: string;
    deviceInfo?: string;
  }): Promise<void> {
    await this.pool.query(
      `
        insert into customer_session (
          salon_id,
          customer_id,
          refresh_token_hash,
          device_info,
          expires_at
        )
        values ($1, $2, $3, $4, $5)
      `,
      [
        input.salonId,
        input.customerId,
        input.refreshTokenHash,
        input.deviceInfo ?? null,
        input.expiresAt,
      ],
    );
  }

  async findActiveCustomerSessionByTokenHash(input: {
    salonId: string;
    refreshTokenHash: string;
  }): Promise<CustomerSessionRecord | null> {
    const result = await this.pool.query<CustomerSessionRow>(
      `
        select
          id,
          customer_id,
          expires_at,
          revoked_at
        from customer_session
        where salon_id = $1
          and refresh_token_hash = $2
          and revoked_at is null
          and expires_at > now()
        limit 1
      `,
      [input.salonId, input.refreshTokenHash],
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      customerId: row.customer_id,
      expiresAt: toIsoString(row.expires_at),
      revokedAt: row.revoked_at ? toIsoString(row.revoked_at) : null,
    };
  }

  async rotateCustomerSession(input: {
    sessionId: string;
    refreshTokenHash: string;
    expiresAt: string;
  }): Promise<void> {
    await this.pool.query(
      `
        update customer_session
        set
          refresh_token_hash = $2,
          expires_at = $3,
          revoked_at = null
        where id = $1
      `,
      [input.sessionId, input.refreshTokenHash, input.expiresAt],
    );
  }

  async revokeCustomerSessionByTokenHash(input: {
    salonId: string;
    refreshTokenHash: string;
    revokedAt: string;
  }): Promise<void> {
    await this.pool.query(
      `
        update customer_session
        set revoked_at = $3
        where salon_id = $1
          and refresh_token_hash = $2
          and revoked_at is null
      `,
      [input.salonId, input.refreshTokenHash, input.revokedAt],
    );
  }

  async findStaffByEmail(
    salonId: string,
    email: string,
  ): Promise<StaffAuthProfile | null> {
    const result = await this.pool.query<StaffRow>(
      `
        select
          id,
          email,
          password_hash,
          first_name,
          last_name,
          role,
          barber_id,
          is_active
        from admin_user
        where salon_id = $1
          and lower(email) = lower($2)
        limit 1
      `,
      [salonId, email],
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role,
      barberId: row.barber_id,
      isActive: row.is_active,
    };
  }

  async findStaffById(
    salonId: string,
    staffId: string,
  ): Promise<StaffAuthProfile | null> {
    const result = await this.pool.query<StaffRow>(
      `
        select
          id,
          email,
          password_hash,
          first_name,
          last_name,
          role,
          barber_id,
          is_active
        from admin_user
        where salon_id = $1
          and id = $2
        limit 1
      `,
      [salonId, staffId],
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role,
      barberId: row.barber_id,
      isActive: row.is_active,
    };
  }

  async createStaffSession(input: {
    salonId: string;
    adminUserId: string;
    refreshTokenHash: string;
    expiresAt: string;
    deviceInfo?: string;
  }): Promise<void> {
    await this.pool.query(
      `
        insert into admin_user_session (
          salon_id,
          admin_user_id,
          refresh_token_hash,
          device_info,
          expires_at
        )
        values ($1, $2, $3, $4, $5)
      `,
      [
        input.salonId,
        input.adminUserId,
        input.refreshTokenHash,
        input.deviceInfo ?? null,
        input.expiresAt,
      ],
    );
  }

  async findActiveStaffSessionByTokenHash(input: {
    salonId: string;
    refreshTokenHash: string;
  }): Promise<StaffSessionRecord | null> {
    const result = await this.pool.query<StaffSessionRow>(
      `
        select
          id,
          admin_user_id,
          expires_at,
          revoked_at
        from admin_user_session
        where salon_id = $1
          and refresh_token_hash = $2
          and revoked_at is null
          and expires_at > now()
        limit 1
      `,
      [input.salonId, input.refreshTokenHash],
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      adminUserId: row.admin_user_id,
      expiresAt: toIsoString(row.expires_at),
      revokedAt: row.revoked_at ? toIsoString(row.revoked_at) : null,
    };
  }

  async rotateStaffSession(input: {
    sessionId: string;
    refreshTokenHash: string;
    expiresAt: string;
  }): Promise<void> {
    await this.pool.query(
      `
        update admin_user_session
        set
          refresh_token_hash = $2,
          expires_at = $3,
          revoked_at = null
        where id = $1
      `,
      [input.sessionId, input.refreshTokenHash, input.expiresAt],
    );
  }

  async revokeStaffSessionByTokenHash(input: {
    salonId: string;
    refreshTokenHash: string;
    revokedAt: string;
  }): Promise<void> {
    await this.pool.query(
      `
        update admin_user_session
        set revoked_at = $3
        where salon_id = $1
          and refresh_token_hash = $2
          and revoked_at is null
      `,
      [input.salonId, input.refreshTokenHash, input.revokedAt],
    );
  }
}
