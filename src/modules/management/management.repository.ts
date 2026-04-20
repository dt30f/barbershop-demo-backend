import { Injectable, NotImplementedException } from '@nestjs/common';

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

export abstract class ManagementRepository {
  abstract listPublicBarbers(salonId: string): Promise<PublicBarberListItem[]>;
  abstract getPublicBarberDetail(
    salonId: string,
    barberId: string,
  ): Promise<PublicBarberDetail | null>;
  abstract getPublicSalonContact(salonId: string): Promise<PublicSalonContact | null>;
  abstract listBarbers(salonId: string): Promise<BarberAdminListItem[]>;
  abstract createBarber(input: {
    salonId: string;
    firstName: string;
    lastName: string;
    displayName: string;
    level?: string;
    bio?: string;
    photoUrl?: string;
    isActive: boolean;
    displayOrder: number;
  }): Promise<BarberAdminListItem>;
  abstract updateBarber(input: {
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
  }): Promise<BarberAdminListItem | null>;

  abstract listServices(salonId: string): Promise<ServiceAdminListItem[]>;
  abstract createService(input: {
    salonId: string;
    name: string;
    description?: string;
    durationMinutes: number;
    isActive: boolean;
    displayOrder: number;
  }): Promise<ServiceAdminListItem>;
  abstract updateService(input: {
    salonId: string;
    serviceId: string;
    name?: string;
    description?: string | null;
    durationMinutes?: number;
    isActive?: boolean;
    displayOrder?: number;
  }): Promise<ServiceAdminListItem | null>;

  abstract listBarberServicePricing(
    salonId: string,
  ): Promise<BarberServicePricingItem[]>;
  abstract upsertBarberServicePricing(input: {
    salonId: string;
    items: Array<{
      barberId: string;
      serviceId: string;
      priceAmount: number;
      currency: string;
      durationOverrideMinutes?: number | null;
      isActive: boolean;
    }>;
  }): Promise<BarberServicePricingItem[]>;

  abstract getSalonSettings(salonId: string): Promise<SalonAdminSettings | null>;
  abstract updateSalonSettings(input: {
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
  }): Promise<SalonAdminSettings | null>;

  abstract listWorkingHours(salonId: string): Promise<WorkingHoursAdminItem[]>;
  abstract replaceWorkingHours(input: {
    salonId: string;
    items: WorkingHoursAdminItem[];
  }): Promise<WorkingHoursAdminItem[]>;
}

@Injectable()
export class UnconfiguredManagementRepository implements ManagementRepository {
  async listPublicBarbers(_salonId: string): Promise<PublicBarberListItem[]> {
    throw new NotImplementedException('ManagementRepository is not wired.');
  }

  async getPublicBarberDetail(
    _salonId: string,
    _barberId: string,
  ): Promise<PublicBarberDetail | null> {
    throw new NotImplementedException('ManagementRepository is not wired.');
  }

  async getPublicSalonContact(_salonId: string): Promise<PublicSalonContact | null> {
    throw new NotImplementedException('ManagementRepository is not wired.');
  }

  async listBarbers(_salonId: string): Promise<BarberAdminListItem[]> {
    throw new NotImplementedException('ManagementRepository is not wired.');
  }

  async createBarber(_input: {
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
    throw new NotImplementedException('ManagementRepository is not wired.');
  }

  async updateBarber(_input: {
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
    throw new NotImplementedException('ManagementRepository is not wired.');
  }

  async listServices(_salonId: string): Promise<ServiceAdminListItem[]> {
    throw new NotImplementedException('ManagementRepository is not wired.');
  }

  async createService(_input: {
    salonId: string;
    name: string;
    description?: string;
    durationMinutes: number;
    isActive: boolean;
    displayOrder: number;
  }): Promise<ServiceAdminListItem> {
    throw new NotImplementedException('ManagementRepository is not wired.');
  }

  async updateService(_input: {
    salonId: string;
    serviceId: string;
    name?: string;
    description?: string | null;
    durationMinutes?: number;
    isActive?: boolean;
    displayOrder?: number;
  }): Promise<ServiceAdminListItem | null> {
    throw new NotImplementedException('ManagementRepository is not wired.');
  }

  async listBarberServicePricing(
    _salonId: string,
  ): Promise<BarberServicePricingItem[]> {
    throw new NotImplementedException('ManagementRepository is not wired.');
  }

  async upsertBarberServicePricing(_input: {
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
    throw new NotImplementedException('ManagementRepository is not wired.');
  }

  async getSalonSettings(_salonId: string): Promise<SalonAdminSettings | null> {
    throw new NotImplementedException('ManagementRepository is not wired.');
  }

  async updateSalonSettings(_input: {
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
    throw new NotImplementedException('ManagementRepository is not wired.');
  }

  async listWorkingHours(_salonId: string): Promise<WorkingHoursAdminItem[]> {
    throw new NotImplementedException('ManagementRepository is not wired.');
  }

  async replaceWorkingHours(_input: {
    salonId: string;
    items: WorkingHoursAdminItem[];
  }): Promise<WorkingHoursAdminItem[]> {
    throw new NotImplementedException('ManagementRepository is not wired.');
  }
}
