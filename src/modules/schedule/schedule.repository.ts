import { Injectable, NotImplementedException } from '@nestjs/common';

import { BlockedSlotReasonType } from './schedule.enums';
import {
  CreateBarberDayOffResult,
  CreateBlockedSlotResult,
  GetScheduleDayResult,
} from './schedule.types';

export type BarberScheduleContext = {
  barber: {
    id: string;
    displayName: string;
    isActive: boolean;
  };
  salon: {
    id: string;
    timezone: string;
  };
};

export abstract class ScheduleRepository {
  abstract getBarberScheduleContext(
    salonId: string,
    barberId: string,
  ): Promise<BarberScheduleContext | null>;

  abstract createBarberDayOff(input: {
    salonId: string;
    barberId: string;
    dateLocal: string;
    reason?: string;
    createdByAdminUserId?: string;
  }): Promise<CreateBarberDayOffResult>;

  abstract deleteBarberDayOff(input: {
    salonId: string;
    barberId: string;
    dayOffId: string;
  }): Promise<boolean>;

  abstract createBlockedSlot(input: {
    salonId: string;
    barberId: string;
    startAt: string;
    endAt: string;
    reasonType: BlockedSlotReasonType;
    note?: string;
    createdByAdminUserId?: string;
  }): Promise<CreateBlockedSlotResult>;

  abstract deleteBlockedSlot(input: {
    salonId: string;
    barberId: string;
    blockedSlotId: string;
  }): Promise<boolean>;

  abstract getScheduleDay(input: {
    salonId: string;
    date: string;
    barberId?: string;
  }): Promise<GetScheduleDayResult | null>;
}

@Injectable()
export class UnconfiguredScheduleRepository implements ScheduleRepository {
  async getBarberScheduleContext(
    _salonId: string,
    _barberId: string,
  ): Promise<BarberScheduleContext | null> {
    throw new NotImplementedException(
      'ScheduleRepository is not wired to a real data source yet.',
    );
  }

  async createBarberDayOff(_input: {
    salonId: string;
    barberId: string;
    dateLocal: string;
    reason?: string;
    createdByAdminUserId?: string;
  }): Promise<CreateBarberDayOffResult> {
    throw new NotImplementedException(
      'ScheduleRepository is not wired to a real data source yet.',
    );
  }

  async deleteBarberDayOff(_input: {
    salonId: string;
    barberId: string;
    dayOffId: string;
  }): Promise<boolean> {
    throw new NotImplementedException(
      'ScheduleRepository is not wired to a real data source yet.',
    );
  }

  async createBlockedSlot(_input: {
    salonId: string;
    barberId: string;
    startAt: string;
    endAt: string;
    reasonType: BlockedSlotReasonType;
    note?: string;
    createdByAdminUserId?: string;
  }): Promise<CreateBlockedSlotResult> {
    throw new NotImplementedException(
      'ScheduleRepository is not wired to a real data source yet.',
    );
  }

  async deleteBlockedSlot(_input: {
    salonId: string;
    barberId: string;
    blockedSlotId: string;
  }): Promise<boolean> {
    throw new NotImplementedException(
      'ScheduleRepository is not wired to a real data source yet.',
    );
  }

  async getScheduleDay(_input: {
    salonId: string;
    date: string;
    barberId?: string;
  }): Promise<GetScheduleDayResult | null> {
    throw new NotImplementedException(
      'ScheduleRepository is not wired to a real data source yet.',
    );
  }
}
