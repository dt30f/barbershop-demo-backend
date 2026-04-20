export type GetBarberAvailabilityInput = {
  salonId: string;
  barberId: string;
  barberServiceId: string;
  date: string;
};

export type GetBarberAvailabilityRepositoryInput = GetBarberAvailabilityInput;

export type AvailabilitySlot = {
  startAt: string;
  endAt: string;
};

export type GetBarberAvailabilityResult = {
  date: string;
  barberId: string;
  barberServiceId: string;
  barberAvailable: boolean;
  message: string | null;
  slotGranularityMinutes: number;
  serviceDurationMinutes: number;
  slots: AvailabilitySlot[];
};
