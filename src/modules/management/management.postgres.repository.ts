import { Inject, Injectable } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';

import { DATABASE_POOL } from '../../database/database.constants';
import { ManagementRepository } from './management.repository';
import {
  BarberAdminListItem,
  BarberServicePricingItem,
  PublicBarberDetail,
  PublicBarberListItem,
  PublicBarberServiceItem,
  PublicSalonContact,
  SalonAdminSettings,
  ServiceAdminListItem,
  WorkingHoursAdminItem,
} from './management.types';

type BarberRow = {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string;
  level: string | null;
  bio: string | null;
  photo_url: string | null;
  is_active: boolean;
  display_order: number;
  linked_staff_email: string | null;
  active_services_count: string;
};

type ServiceRow = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  is_active: boolean;
  display_order: number;
  active_barbers_count: string;
};

type PricingRow = {
  barber_service_id: string | null;
  barber_id: string;
  barber_name: string;
  service_id: string;
  service_name: string;
  price_amount: string | null;
  currency: string | null;
  duration_override_minutes: number | null;
  is_active: boolean | null;
};

type SalonSettingsRow = {
  id: string;
  name: string;
  slug: string;
  brand_name: string | null;
  phone: string;
  address: string;
  timezone: string;
  currency: string;
  slot_granularity_minutes: number;
  is_active: boolean;
};

type WorkingHoursRow = {
  day_of_week: number;
  start_time_local: string;
  end_time_local: string;
  is_active: boolean;
};

type PublicBarberRow = {
  id: string;
  display_name: string;
  level: string | null;
  bio: string | null;
  photo_url: string | null;
  active_services_count: string;
};

type PublicBarberServiceRow = {
  barber_service_id: string;
  service_id: string;
  service_name: string;
  description: string | null;
  price_amount: string;
  currency: string | null;
  duration_minutes: number;
  display_order: number;
};

function mapBarber(row: BarberRow): BarberAdminListItem {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    displayName: row.display_name,
    level: row.level,
    bio: row.bio,
    photoUrl: row.photo_url,
    isActive: row.is_active,
    displayOrder: row.display_order,
    linkedStaffEmail: row.linked_staff_email,
    activeServicesCount: Number(row.active_services_count),
  };
}

function mapService(row: ServiceRow): ServiceAdminListItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    durationMinutes: row.duration_minutes,
    isActive: row.is_active,
    displayOrder: row.display_order,
    activeBarbersCount: Number(row.active_barbers_count),
  };
}

function mapPricing(row: PricingRow, defaultCurrency: string): BarberServicePricingItem {
  return {
    barberServiceId: row.barber_service_id,
    barberId: row.barber_id,
    barberName: row.barber_name,
    serviceId: row.service_id,
    serviceName: row.service_name,
    priceAmount: Number(row.price_amount ?? '0'),
    currency: row.currency ?? defaultCurrency,
    durationOverrideMinutes: row.duration_override_minutes,
    isActive: row.is_active ?? false,
    exists: Boolean(row.barber_service_id),
  };
}

function mapSalonSettings(row: SalonSettingsRow): SalonAdminSettings {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    brandName: row.brand_name,
    phone: row.phone,
    address: row.address,
    timezone: row.timezone,
    currency: row.currency,
    slotGranularityMinutes: row.slot_granularity_minutes,
    isActive: row.is_active,
  };
}

function mapWorkingHours(row: WorkingHoursRow): WorkingHoursAdminItem {
  return {
    dayOfWeek: row.day_of_week,
    startTimeLocal: row.start_time_local,
    endTimeLocal: row.end_time_local,
    isActive: row.is_active,
  };
}

function mapPublicBarber(row: PublicBarberRow): PublicBarberListItem {
  return {
    id: row.id,
    displayName: row.display_name,
    level: row.level,
    bio: row.bio,
    photoUrl: row.photo_url,
    activeServicesCount: Number(row.active_services_count),
  };
}

function mapPublicBarberService(
  row: PublicBarberServiceRow,
  fallbackCurrency: string,
): PublicBarberServiceItem {
  return {
    barberServiceId: row.barber_service_id,
    serviceId: row.service_id,
    serviceName: row.service_name,
    description: row.description,
    priceAmount: Number(row.price_amount),
    currency: row.currency ?? fallbackCurrency,
    durationMinutes: row.duration_minutes,
  };
}

@Injectable()
export class PostgresManagementRepository extends ManagementRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {
    super();
  }

  async listPublicBarbers(salonId: string): Promise<PublicBarberListItem[]> {
    const result = await this.pool.query<PublicBarberRow>(
      `
        select
          b.id,
          b.display_name,
          b.level,
          b.bio,
          b.photo_url,
          count(bs.id) filter (where bs.is_active) ::text as active_services_count
        from barber b
        left join barber_service bs
          on bs.salon_id = b.salon_id
         and bs.barber_id = b.id
        where b.salon_id = $1
          and b.is_active = true
        group by
          b.id,
          b.display_name,
          b.level,
          b.bio,
          b.photo_url,
          b.display_order
        order by b.display_order asc, b.display_name asc
      `,
      [salonId],
    );

    return result.rows.map(mapPublicBarber);
  }

  async getPublicBarberDetail(
    salonId: string,
    barberId: string,
  ): Promise<PublicBarberDetail | null> {
    const [barbers, salon] = await Promise.all([
      this.pool.query<PublicBarberRow>(
        `
          select
            b.id,
            b.display_name,
            b.level,
            b.bio,
            b.photo_url,
            count(bs.id) filter (where bs.is_active) ::text as active_services_count
          from barber b
          left join barber_service bs
            on bs.salon_id = b.salon_id
           and bs.barber_id = b.id
          where b.salon_id = $1
            and b.id = $2
            and b.is_active = true
          group by
            b.id,
            b.display_name,
            b.level,
            b.bio,
            b.photo_url
        `,
        [salonId, barberId],
      ),
      this.getSalonSettings(salonId),
    ]);

    const barber = barbers.rows[0];
    if (!barber) {
      return null;
    }

    const servicesResult = await this.pool.query<PublicBarberServiceRow>(
      `
        select
          bs.id as barber_service_id,
          s.id as service_id,
          s.name as service_name,
          s.description,
          bs.price_amount::text as price_amount,
          bs.currency,
          coalesce(bs.duration_override_minutes, s.duration_minutes) as duration_minutes,
          s.display_order
        from barber_service bs
        inner join service s
          on s.salon_id = bs.salon_id
         and s.id = bs.service_id
        where bs.salon_id = $1
          and bs.barber_id = $2
          and bs.is_active = true
          and s.is_active = true
        order by s.display_order asc, s.name asc
      `,
      [salonId, barberId],
    );

    const fallbackCurrency = salon?.currency ?? 'RSD';

    return {
      id: barber.id,
      displayName: barber.display_name,
      level: barber.level,
      bio: barber.bio,
      photoUrl: barber.photo_url,
      services: servicesResult.rows.map((row) =>
        mapPublicBarberService(row, fallbackCurrency),
      ),
    };
  }

  async getPublicSalonContact(salonId: string): Promise<PublicSalonContact | null> {
    const [salon, workingHours] = await Promise.all([
      this.getSalonSettings(salonId),
      this.listWorkingHours(salonId),
    ]);

    if (!salon) {
      return null;
    }

    return {
      id: salon.id,
      name: salon.name,
      brandName: salon.brandName,
      phone: salon.phone,
      address: salon.address,
      timezone: salon.timezone,
      currency: salon.currency,
      slotGranularityMinutes: salon.slotGranularityMinutes,
      workingHours,
    };
  }

  async listBarbers(salonId: string): Promise<BarberAdminListItem[]> {
    const result = await this.pool.query<BarberRow>(
      `
        select
          b.id,
          b.first_name,
          b.last_name,
          b.display_name,
          b.level,
          b.bio,
          b.photo_url,
          b.is_active,
          b.display_order,
          max(au.email) as linked_staff_email,
          count(bs.id) filter (where bs.is_active) ::text as active_services_count
        from barber b
        left join admin_user au
          on au.salon_id = b.salon_id
         and au.barber_id = b.id
         and au.role = 'BARBER'
         and au.is_active = true
        left join barber_service bs
          on bs.salon_id = b.salon_id
         and bs.barber_id = b.id
        where b.salon_id = $1
        group by
          b.id,
          b.first_name,
          b.last_name,
          b.display_name,
          b.level,
          b.bio,
          b.photo_url,
          b.is_active,
          b.display_order
        order by b.display_order asc, b.display_name asc
      `,
      [salonId],
    );

    return result.rows.map(mapBarber);
  }

  async createBarber(input: {
    salonId: string;
    firstName: string;
    lastName: string;
    displayName: string;
    level?: string;
    bio?: string;
    photoUrl?: string;
    isActive: boolean;
    displayOrder: number;
  }): Promise<BarberAdminListItem> {
    const result = await this.pool.query<BarberRow>(
      `
        insert into barber (
          salon_id,
          first_name,
          last_name,
          display_name,
          level,
          bio,
          photo_url,
          is_active,
          display_order
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        returning
          id,
          first_name,
          last_name,
          display_name,
          level,
          bio,
          photo_url,
          is_active,
          display_order,
          null::text as linked_staff_email,
          '0'::text as active_services_count
      `,
      [
        input.salonId,
        input.firstName,
        input.lastName,
        input.displayName,
        input.level ?? null,
        input.bio ?? null,
        input.photoUrl ?? null,
        input.isActive,
        input.displayOrder,
      ],
    );

    return mapBarber(result.rows[0]);
  }

  async updateBarber(input: {
    salonId: string;
    barberId: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    level?: string | null;
    bio?: string | null;
    photoUrl?: string | null;
    isActive?: boolean;
    displayOrder?: number;
  }): Promise<BarberAdminListItem | null> {
    await this.pool.query(
      `
        update barber
        set
          first_name = coalesce($3, first_name),
          last_name = coalesce($4, last_name),
          display_name = coalesce($5, display_name),
          level = coalesce($6, level),
          bio = coalesce($7, bio),
          photo_url = coalesce($8, photo_url),
          is_active = coalesce($9, is_active),
          display_order = coalesce($10, display_order)
        where salon_id = $1
          and id = $2
      `,
      [
        input.salonId,
        input.barberId,
        input.firstName ?? null,
        input.lastName ?? null,
        input.displayName ?? null,
        input.level ?? null,
        input.bio ?? null,
        input.photoUrl ?? null,
        input.isActive ?? null,
        input.displayOrder ?? null,
      ],
    );

    const items = await this.listBarbers(input.salonId);
    return items.find((item) => item.id === input.barberId) ?? null;
  }

  async listServices(salonId: string): Promise<ServiceAdminListItem[]> {
    const result = await this.pool.query<ServiceRow>(
      `
        select
          s.id,
          s.name,
          s.description,
          s.duration_minutes,
          s.is_active,
          s.display_order,
          count(bs.id) filter (where bs.is_active) ::text as active_barbers_count
        from service s
        left join barber_service bs
          on bs.salon_id = s.salon_id
         and bs.service_id = s.id
        where s.salon_id = $1
        group by
          s.id,
          s.name,
          s.description,
          s.duration_minutes,
          s.is_active,
          s.display_order
        order by s.display_order asc, s.name asc
      `,
      [salonId],
    );

    return result.rows.map(mapService);
  }

  async createService(input: {
    salonId: string;
    name: string;
    description?: string;
    durationMinutes: number;
    isActive: boolean;
    displayOrder: number;
  }): Promise<ServiceAdminListItem> {
    const result = await this.pool.query<ServiceRow>(
      `
        insert into service (
          salon_id,
          name,
          description,
          duration_minutes,
          is_active,
          display_order
        )
        values ($1, $2, $3, $4, $5, $6)
        returning
          id,
          name,
          description,
          duration_minutes,
          is_active,
          display_order,
          '0'::text as active_barbers_count
      `,
      [
        input.salonId,
        input.name,
        input.description ?? null,
        input.durationMinutes,
        input.isActive,
        input.displayOrder,
      ],
    );

    return mapService(result.rows[0]);
  }

  async updateService(input: {
    salonId: string;
    serviceId: string;
    name?: string;
    description?: string | null;
    durationMinutes?: number;
    isActive?: boolean;
    displayOrder?: number;
  }): Promise<ServiceAdminListItem | null> {
    await this.pool.query(
      `
        update service
        set
          name = coalesce($3, name),
          description = coalesce($4, description),
          duration_minutes = coalesce($5, duration_minutes),
          is_active = coalesce($6, is_active),
          display_order = coalesce($7, display_order)
        where salon_id = $1
          and id = $2
      `,
      [
        input.salonId,
        input.serviceId,
        input.name ?? null,
        input.description ?? null,
        input.durationMinutes ?? null,
        input.isActive ?? null,
        input.displayOrder ?? null,
      ],
    );

    const items = await this.listServices(input.salonId);
    return items.find((item) => item.id === input.serviceId) ?? null;
  }

  async listBarberServicePricing(
    salonId: string,
  ): Promise<BarberServicePricingItem[]> {
    const salon = await this.getSalonSettings(salonId);
    const defaultCurrency = salon?.currency ?? 'RSD';

    const result = await this.pool.query<PricingRow>(
      `
        select
          bs.id as barber_service_id,
          b.id as barber_id,
          b.display_name as barber_name,
          s.id as service_id,
          s.name as service_name,
          bs.price_amount::text as price_amount,
          bs.currency,
          bs.duration_override_minutes,
          bs.is_active
        from barber b
        cross join service s
        left join barber_service bs
          on bs.salon_id = b.salon_id
         and bs.barber_id = b.id
         and bs.service_id = s.id
        where b.salon_id = $1
          and s.salon_id = $1
        order by b.display_order asc, b.display_name asc, s.display_order asc, s.name asc
      `,
      [salonId],
    );

    return result.rows.map((row) => mapPricing(row, defaultCurrency));
  }

  async upsertBarberServicePricing(input: {
    salonId: string;
    items: Array<{
      barberId: string;
      serviceId: string;
      priceAmount: number;
      currency: string;
      durationOverrideMinutes?: number | null;
      isActive: boolean;
    }>;
  }): Promise<BarberServicePricingItem[]> {
    const client = await this.pool.connect();

    try {
      await client.query('begin');

      for (const item of input.items) {
        await client.query(
          `
            insert into barber_service (
              salon_id,
              barber_id,
              service_id,
              price_amount,
              currency,
              duration_override_minutes,
              is_active
            )
            values ($1, $2, $3, $4, $5, $6, $7)
            on conflict (barber_id, service_id)
            do update set
              price_amount = excluded.price_amount,
              currency = excluded.currency,
              duration_override_minutes = excluded.duration_override_minutes,
              is_active = excluded.is_active
          `,
          [
            input.salonId,
            item.barberId,
            item.serviceId,
            item.priceAmount,
            item.currency,
            item.durationOverrideMinutes ?? null,
            item.isActive,
          ],
        );
      }

      await client.query('commit');
    } catch (error) {
      await this.rollbackQuietly(client);
      throw error;
    } finally {
      client.release();
    }

    return this.listBarberServicePricing(input.salonId);
  }

  async getSalonSettings(salonId: string): Promise<SalonAdminSettings | null> {
    const result = await this.pool.query<SalonSettingsRow>(
      `
        select
          id,
          name,
          slug,
          brand_name,
          phone,
          address,
          timezone,
          currency,
          slot_granularity_minutes,
          is_active
        from salon
        where id = $1
        limit 1
      `,
      [salonId],
    );

    const row = result.rows[0];
    return row ? mapSalonSettings(row) : null;
  }

  async updateSalonSettings(input: {
    salonId: string;
    name?: string;
    slug?: string;
    brandName?: string | null;
    phone?: string;
    address?: string;
    timezone?: string;
    currency?: string;
    slotGranularityMinutes?: number;
    isActive?: boolean;
  }): Promise<SalonAdminSettings | null> {
    const result = await this.pool.query<SalonSettingsRow>(
      `
        update salon
        set
          name = coalesce($2, name),
          slug = coalesce($3, slug),
          brand_name = coalesce($4, brand_name),
          phone = coalesce($5, phone),
          address = coalesce($6, address),
          timezone = coalesce($7, timezone),
          currency = coalesce($8, currency),
          slot_granularity_minutes = coalesce($9, slot_granularity_minutes),
          is_active = coalesce($10, is_active)
        where id = $1
        returning
          id,
          name,
          slug,
          brand_name,
          phone,
          address,
          timezone,
          currency,
          slot_granularity_minutes,
          is_active
      `,
      [
        input.salonId,
        input.name ?? null,
        input.slug ?? null,
        input.brandName ?? null,
        input.phone ?? null,
        input.address ?? null,
        input.timezone ?? null,
        input.currency ?? null,
        input.slotGranularityMinutes ?? null,
        input.isActive ?? null,
      ],
    );

    const row = result.rows[0];
    return row ? mapSalonSettings(row) : null;
  }

  async listWorkingHours(salonId: string): Promise<WorkingHoursAdminItem[]> {
    const result = await this.pool.query<WorkingHoursRow>(
      `
        select
          day_of_week,
          start_time_local::text as start_time_local,
          end_time_local::text as end_time_local,
          is_active
        from working_hours
        where salon_id = $1
        order by day_of_week asc
      `,
      [salonId],
    );

    return result.rows.map(mapWorkingHours);
  }

  async replaceWorkingHours(input: {
    salonId: string;
    items: WorkingHoursAdminItem[];
  }): Promise<WorkingHoursAdminItem[]> {
    const client = await this.pool.connect();

    try {
      await client.query('begin');

      for (const item of input.items) {
        await client.query(
          `
            insert into working_hours (
              salon_id,
              day_of_week,
              start_time_local,
              end_time_local,
              is_active
            )
            values ($1, $2, $3::time, $4::time, $5)
            on conflict (salon_id, day_of_week)
            do update set
              start_time_local = excluded.start_time_local,
              end_time_local = excluded.end_time_local,
              is_active = excluded.is_active
          `,
          [
            input.salonId,
            item.dayOfWeek,
            item.startTimeLocal,
            item.endTimeLocal,
            item.isActive,
          ],
        );
      }

      await client.query('commit');
    } catch (error) {
      await this.rollbackQuietly(client);
      throw error;
    } finally {
      client.release();
    }

    return this.listWorkingHours(input.salonId);
  }

  private async rollbackQuietly(client: PoolClient): Promise<void> {
    try {
      await client.query('rollback');
    } catch {
      return;
    }
  }
}
