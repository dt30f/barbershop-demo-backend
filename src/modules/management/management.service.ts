import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { ManagementRepository } from './management.repository';
import {
  BarberAdminListItem,
  BarberServicePricingItem,
  PublicBarberDetail,
  PublicBarberListItem,
  PublicSalonContact,
  SalonAdminSettings,
  ServiceAdminListItem,
  WorkingHoursAdminItem,
} from './management.types';

function normalizeOptionalText(value?: string | null): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const normalized = value.trim();
  return normalized === '' ? null : normalized;
}

@Injectable()
export class ManagementService {
  constructor(private readonly managementRepository: ManagementRepository) {}

  listPublicBarbers(salonId: string): Promise<PublicBarberListItem[]> {
    return this.managementRepository.listPublicBarbers(salonId);
  }

  async getPublicBarberDetail(
    salonId: string,
    barberId: string,
  ): Promise<PublicBarberDetail> {
    const barber = await this.managementRepository.getPublicBarberDetail(
      salonId,
      barberId,
    );

    if (!barber) {
      throw new NotFoundException('Barber nije pronadjen.');
    }

    return barber;
  }

  async getPublicSalonContact(salonId: string): Promise<PublicSalonContact> {
    const contact = await this.managementRepository.getPublicSalonContact(salonId);

    if (!contact) {
      throw new NotFoundException('Salon kontakt nije pronadjen.');
    }

    return contact;
  }

  listBarbers(salonId: string): Promise<BarberAdminListItem[]> {
    return this.managementRepository.listBarbers(salonId);
  }

  createBarber(input: {
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
    return this.managementRepository.createBarber({
      ...input,
      level: normalizeOptionalText(input.level) ?? undefined,
      bio: normalizeOptionalText(input.bio) ?? undefined,
      photoUrl: normalizeOptionalText(input.photoUrl) ?? undefined,
    });
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
  }): Promise<BarberAdminListItem> {
    const barber = await this.managementRepository.updateBarber({
      ...input,
      level: normalizeOptionalText(input.level),
      bio: normalizeOptionalText(input.bio),
      photoUrl: normalizeOptionalText(input.photoUrl),
    });

    if (!barber) {
      throw new NotFoundException('Barber nije pronadjen.');
    }

    return barber;
  }

  listServices(salonId: string): Promise<ServiceAdminListItem[]> {
    return this.managementRepository.listServices(salonId);
  }

  createService(input: {
    salonId: string;
    name: string;
    description?: string;
    durationMinutes: number;
    isActive: boolean;
    displayOrder: number;
  }): Promise<ServiceAdminListItem> {
    return this.managementRepository.createService({
      ...input,
      description: normalizeOptionalText(input.description) ?? undefined,
    });
  }

  async updateService(input: {
    salonId: string;
    serviceId: string;
    name?: string;
    description?: string | null;
    durationMinutes?: number;
    isActive?: boolean;
    displayOrder?: number;
  }): Promise<ServiceAdminListItem> {
    const service = await this.managementRepository.updateService({
      ...input,
      description: normalizeOptionalText(input.description),
    });

    if (!service) {
      throw new NotFoundException('Service nije pronadjen.');
    }

    return service;
  }

  listBarberServicePricing(salonId: string): Promise<BarberServicePricingItem[]> {
    return this.managementRepository.listBarberServicePricing(salonId);
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
    if (input.items.length === 0) {
      throw new UnprocessableEntityException('Pricing lista ne moze biti prazna.');
    }

    const uniqueKeys = new Set<string>();
    for (const item of input.items) {
      const key = `${item.barberId}:${item.serviceId}`;
      if (uniqueKeys.has(key)) {
        throw new ConflictException(
          'Pricing payload sadrzi duplikat barber + service kombinacije.',
        );
      }

      uniqueKeys.add(key);
    }

    return this.managementRepository.upsertBarberServicePricing(input);
  }

  async getSalonSettings(salonId: string): Promise<SalonAdminSettings> {
    const settings = await this.managementRepository.getSalonSettings(salonId);
    if (!settings) {
      throw new NotFoundException('Salon settings nisu pronadjeni.');
    }

    return settings;
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
  }): Promise<SalonAdminSettings> {
    const settings = await this.managementRepository.updateSalonSettings({
      ...input,
      brandName: normalizeOptionalText(input.brandName),
    });

    if (!settings) {
      throw new NotFoundException('Salon settings nisu pronadjeni.');
    }

    return settings;
  }

  listWorkingHours(salonId: string): Promise<WorkingHoursAdminItem[]> {
    return this.managementRepository.listWorkingHours(salonId);
  }

  async replaceWorkingHours(input: {
    salonId: string;
    items: WorkingHoursAdminItem[];
  }): Promise<WorkingHoursAdminItem[]> {
    if (input.items.length !== 7) {
      throw new UnprocessableEntityException(
        'Working hours payload mora da sadrzi tacno 7 dana.',
      );
    }

    const days = input.items.map((item) => item.dayOfWeek);
    if (new Set(days).size !== 7) {
      throw new UnprocessableEntityException(
        'Working hours payload mora imati jedinstven dayOfWeek za svih 7 dana.',
      );
    }

    return this.managementRepository.replaceWorkingHours(input);
  }
}
