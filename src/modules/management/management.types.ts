export type BarberAdminListItem = {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  level?: string | null;
  bio?: string | null;
  photoUrl?: string | null;
  isActive: boolean;
  displayOrder: number;
  linkedStaffEmail?: string | null;
  activeServicesCount: number;
};

export type ServiceAdminListItem = {
  id: string;
  name: string;
  description?: string | null;
  durationMinutes: number;
  isActive: boolean;
  displayOrder: number;
  activeBarbersCount: number;
};

export type BarberServicePricingItem = {
  barberServiceId?: string | null;
  barberId: string;
  barberName: string;
  serviceId: string;
  serviceName: string;
  priceAmount: number;
  currency: string;
  durationOverrideMinutes?: number | null;
  isActive: boolean;
  exists: boolean;
};

export type SalonAdminSettings = {
  id: string;
  name: string;
  slug: string;
  brandName?: string | null;
  phone: string;
  address: string;
  timezone: string;
  currency: string;
  slotGranularityMinutes: number;
  isActive: boolean;
};

export type WorkingHoursAdminItem = {
  dayOfWeek: number;
  startTimeLocal: string;
  endTimeLocal: string;
  isActive: boolean;
};

export type PublicBarberListItem = {
  id: string;
  displayName: string;
  level?: string | null;
  bio?: string | null;
  photoUrl?: string | null;
  activeServicesCount: number;
};

export type PublicBarberServiceItem = {
  barberServiceId: string;
  serviceId: string;
  serviceName: string;
  description?: string | null;
  priceAmount: number;
  currency: string;
  durationMinutes: number;
};

export type PublicBarberDetail = {
  id: string;
  displayName: string;
  level?: string | null;
  bio?: string | null;
  photoUrl?: string | null;
  services: PublicBarberServiceItem[];
};

export type PublicSalonContact = {
  id: string;
  name: string;
  brandName?: string | null;
  phone: string;
  address: string;
  timezone: string;
  currency: string;
  slotGranularityMinutes: number;
  workingHours: WorkingHoursAdminItem[];
};
