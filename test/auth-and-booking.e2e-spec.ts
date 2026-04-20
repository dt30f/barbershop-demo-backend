import 'reflect-metadata';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { Test } from '@nestjs/testing';

import { AppModule } from '../src/app.module';

const request: typeof import('supertest') = require('supertest');

const SALON_ID = '11111111-1111-1111-1111-111111111111';
const MARKO_BARBER_ID = '22222222-2222-2222-2222-222222222221';
const MARKO_CLASSIC_SERVICE_ID = '44444444-4444-4444-4444-444444444441';
const MARKO_CLASSIC_BARBER_SERVICE_ID = '55555555-5555-5555-5555-555555555551';
const NIKOLA_BARBER_ID = '22222222-2222-2222-2222-222222222222';
const NIKOLA_COMBO_SERVICE_ID = '44444444-4444-4444-4444-444444444443';
const NIKOLA_COMBO_BARBER_SERVICE_ID = '55555555-5555-5555-5555-555555555554';

function addDaysLocal(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDateOnly(date: Date): string {
  return [
    String(date.getFullYear()).padStart(4, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

async function findFirstAvailableSlot(input: {
  app: INestApplication;
  barberId: string;
  barberServiceId: string;
  startDayOffset?: number;
  endDayOffset?: number;
}): Promise<{ startAt: string; endAt: string; date: string }> {
  const startDayOffset = input.startDayOffset ?? 2;
  const endDayOffset = input.endDayOffset ?? 10;

  for (let dayOffset = startDayOffset; dayOffset <= endDayOffset; dayOffset += 1) {
    const targetDate = formatDateOnly(addDaysLocal(new Date(), dayOffset));
    const availabilityResponse = await request(input.app.getHttpServer())
      .get(`/api/v1/public/barbers/${input.barberId}/availability`)
      .query({
        barberServiceId: input.barberServiceId,
        date: targetDate,
      })
      .expect(200);

    const slot = availabilityResponse.body.slots?.[0];

    if (slot) {
      return {
        startAt: slot.startAt,
        endAt: slot.endAt,
        date: targetDate,
      };
    }
  }

  throw new Error('No available slot found in e2e search window.');
}

describe('Auth and booking e2e', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.APP_SALON_ID = SALON_ID;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('supports customer login, me, logout and refresh invalidation', async () => {
    const phoneNumber = `+38164${Date.now().toString().slice(-6)}`;

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/customer/login')
      .send({
        phoneNumber,
        firstName: 'E2E',
        lastName: 'Customer',
      })
      .expect(201);

    expect(loginResponse.body.accessToken).toEqual(expect.any(String));
    expect(loginResponse.body.refreshToken).toEqual(expect.any(String));
    expect(loginResponse.body.customer.phoneNumber).toBe(phoneNumber);

    const meResponse = await request(app.getHttpServer())
      .get('/api/v1/auth/customer/me')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .expect(200);

    expect(meResponse.body.phoneNumber).toBe(phoneNumber);

    const logoutResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/customer/logout')
      .send({
        refreshToken: loginResponse.body.refreshToken,
      })
      .expect(201);

    expect(logoutResponse.body.success).toBe(true);

    await request(app.getHttpServer())
      .post('/api/v1/auth/customer/refresh')
      .send({
        refreshToken: loginResponse.body.refreshToken,
      })
      .expect(401);
  });

  it('supports customer booking flow through public availability and appointments endpoints', async () => {
    const phoneNumber = `+38165${Date.now().toString().slice(-6)}`;

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/customer/login')
      .send({
        phoneNumber,
        firstName: 'Booker',
        lastName: 'Flow',
      })
      .expect(201);

    const slot = await findFirstAvailableSlot({
      app,
      barberId: MARKO_BARBER_ID,
      barberServiceId: MARKO_CLASSIC_BARBER_SERVICE_ID,
    });

    const bookingResponse = await request(app.getHttpServer())
      .post('/api/v1/customer/appointments')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .send({
        barberId: MARKO_BARBER_ID,
        barberServiceId: MARKO_CLASSIC_BARBER_SERVICE_ID,
        startAt: slot.startAt,
      })
      .expect(201);

    expect(bookingResponse.body.status).toBe('CONFIRMED');
    expect(bookingResponse.body.barberId).toBe(MARKO_BARBER_ID);
    expect(bookingResponse.body.serviceId).toBe(MARKO_CLASSIC_SERVICE_ID);

    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/customer/appointments')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .expect(200);

    expect(
      listResponse.body.some(
        (item: { id: string }) => item.id === bookingResponse.body.id,
      ),
    ).toBe(true);

    const cancelResponse = await request(app.getHttpServer())
      .post(`/api/v1/customer/appointments/${bookingResponse.body.id}/cancel`)
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .expect(201);

    expect(cancelResponse.body.status).toBe('CANCELLED');
  });

  it('supports staff login, refresh and logout invalidation', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/staff/login')
      .send({
        email: 'admin@downtownbarber.rs',
        password: 'Admin123!',
      })
      .expect(201);

    expect(loginResponse.body.accessToken).toEqual(expect.any(String));
    expect(loginResponse.body.refreshToken).toEqual(expect.any(String));
    expect(loginResponse.body.staff.role).toBe('ADMIN');

    const refreshResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/staff/refresh')
      .send({
        refreshToken: loginResponse.body.refreshToken,
      })
      .expect(201);

    expect(refreshResponse.body.accessToken).toEqual(expect.any(String));
    expect(refreshResponse.body.refreshToken).toEqual(expect.any(String));
    expect(refreshResponse.body.refreshToken).not.toBe(loginResponse.body.refreshToken);

    const logoutResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/staff/logout')
      .send({
        refreshToken: refreshResponse.body.refreshToken,
      })
      .expect(201);

    expect(logoutResponse.body.success).toBe(true);

    await request(app.getHttpServer())
      .post('/api/v1/auth/staff/refresh')
      .send({
        refreshToken: refreshResponse.body.refreshToken,
      })
      .expect(401);
  });

  it('allows admin bearer token to create a manual booking', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/staff/login')
      .send({
        email: 'admin@downtownbarber.rs',
        password: 'Admin123!',
      })
      .expect(201);

    const slot = await findFirstAvailableSlot({
      app,
      barberId: MARKO_BARBER_ID,
      barberServiceId: MARKO_CLASSIC_BARBER_SERVICE_ID,
      startDayOffset: 3,
    });
    const customerPhoneNumber = `+38166${Date.now().toString().slice(-6)}`;

    const bookingResponse = await request(app.getHttpServer())
      .post('/api/v1/admin/appointments')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .send({
        customerPhoneNumber,
        customerFirstName: 'Admin',
        customerLastName: 'Caller',
        barberId: MARKO_BARBER_ID,
        barberServiceId: MARKO_CLASSIC_BARBER_SERVICE_ID,
        startAt: slot.startAt,
      })
      .expect(201);

    expect(bookingResponse.body.status).toBe('CONFIRMED');
    expect(bookingResponse.body.barberId).toBe(MARKO_BARBER_ID);
    expect(bookingResponse.body.serviceId).toBe(MARKO_CLASSIC_SERVICE_ID);

    const adminListResponse = await request(app.getHttpServer())
      .get('/api/v1/admin/appointments')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .query({
        barberId: MARKO_BARBER_ID,
        status: 'CONFIRMED',
        dateFrom: slot.date,
        dateTo: slot.date,
        customerPhone: customerPhoneNumber.slice(-6),
        page: 1,
        pageSize: 1,
        sortBy: 'START_AT',
        sortDirection: 'ASC',
      })
      .expect(200);

    expect(adminListResponse.body.pagination.page).toBe(1);
    expect(adminListResponse.body.pagination.pageSize).toBe(1);
    expect(adminListResponse.body.pagination.total).toBeGreaterThanOrEqual(1);
    expect(adminListResponse.body.sort.sortBy).toBe('START_AT');
    expect(adminListResponse.body.sort.sortDirection).toBe('ASC');
    expect(
      adminListResponse.body.items.some(
        (item: { id: string; barberId: string; status: string }) =>
          item.id === bookingResponse.body.id &&
          item.barberId === MARKO_BARBER_ID &&
          item.status === 'CONFIRMED',
      ),
    ).toBe(true);
  });

  it('allows barber bearer token to create a manual booking for own schedule', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/staff/login')
      .send({
        email: 'nikola@downtownbarber.rs',
        password: 'Barber123!',
      })
      .expect(201);

    expect(loginResponse.body.staff.role).toBe('BARBER');
    expect(loginResponse.body.staff.barberId).toBe(NIKOLA_BARBER_ID);

    const slot = await findFirstAvailableSlot({
      app,
      barberId: NIKOLA_BARBER_ID,
      barberServiceId: NIKOLA_COMBO_BARBER_SERVICE_ID,
      startDayOffset: 3,
    });

    const bookingResponse = await request(app.getHttpServer())
      .post('/api/v1/barber/appointments')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .send({
        customerPhoneNumber: `+38167${Date.now().toString().slice(-6)}`,
        customerFirstName: 'Barber',
        customerLastName: 'Walkin',
        barberServiceId: NIKOLA_COMBO_BARBER_SERVICE_ID,
        startAt: slot.startAt,
      })
      .expect(201);

    expect(bookingResponse.body.status).toBe('CONFIRMED');
    expect(bookingResponse.body.barberId).toBe(NIKOLA_BARBER_ID);
    expect(bookingResponse.body.serviceId).toBe(NIKOLA_COMBO_SERVICE_ID);
  });

  it('allows admin to add day off and force reschedule on overlapping booking', async () => {
    const customerPhoneNumber = `+38168${Date.now().toString().slice(-6)}`;

    const customerLoginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/customer/login')
      .send({
        phoneNumber: customerPhoneNumber,
        firstName: 'Dayoff',
        lastName: 'Customer',
      })
      .expect(201);

    const customerSlot = await findFirstAvailableSlot({
      app,
      barberId: MARKO_BARBER_ID,
      barberServiceId: MARKO_CLASSIC_BARBER_SERVICE_ID,
      startDayOffset: 5,
    });

    const bookingResponse = await request(app.getHttpServer())
      .post('/api/v1/customer/appointments')
      .set('Authorization', `Bearer ${customerLoginResponse.body.accessToken}`)
      .send({
        barberId: MARKO_BARBER_ID,
        barberServiceId: MARKO_CLASSIC_BARBER_SERVICE_ID,
        startAt: customerSlot.startAt,
      })
      .expect(201);

    const adminLoginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/staff/login')
      .send({
        email: 'admin@downtownbarber.rs',
        password: 'Admin123!',
      })
      .expect(201);

    const dayOffResponse = await request(app.getHttpServer())
      .post(`/api/v1/admin/barbers/${MARKO_BARBER_ID}/day-off`)
      .set('Authorization', `Bearer ${adminLoginResponse.body.accessToken}`)
      .send({
        dateLocal: customerSlot.date,
        reason: 'Salon closed for internal event.',
      })
      .expect(201);

    expect(dayOffResponse.body.barberId).toBe(MARKO_BARBER_ID);
    expect(dayOffResponse.body.dateLocal).toBe(customerSlot.date);
    expect(dayOffResponse.body.impactedAppointments).toBeGreaterThanOrEqual(1);

    const customerListResponse = await request(app.getHttpServer())
      .get('/api/v1/customer/appointments')
      .set('Authorization', `Bearer ${customerLoginResponse.body.accessToken}`)
      .expect(200);

    const impactedAppointment = customerListResponse.body.find(
      (item: { id: string }) => item.id === bookingResponse.body.id,
    );

    expect(impactedAppointment).toBeDefined();
    expect(impactedAppointment.status).toBe('REQUIRES_RESCHEDULE');

    const scheduleResponse = await request(app.getHttpServer())
      .get('/api/v1/admin/schedule/day')
      .set('Authorization', `Bearer ${adminLoginResponse.body.accessToken}`)
      .query({
        date: customerSlot.date,
        barberId: MARKO_BARBER_ID,
      })
      .expect(200);

    expect(scheduleResponse.body.date).toBe(customerSlot.date);
    expect(scheduleResponse.body.barbers).toHaveLength(1);
    expect(scheduleResponse.body.barbers[0].barberId).toBe(MARKO_BARBER_ID);
    expect(scheduleResponse.body.barbers[0].dayOff.id).toBe(dayOffResponse.body.id);
    expect(scheduleResponse.body.barbers[0].summary.totalSegments).toBeGreaterThan(0);
    expect(
      scheduleResponse.body.barbers[0].summary.requiresRescheduleSegments,
    ).toBeGreaterThan(0);
    expect(
      scheduleResponse.body.barbers[0].summary.dayOffSegments,
    ).toBeGreaterThan(0);
    expect(
      scheduleResponse.body.barbers[0].segments.some(
        (item: { state: string }) => item.state === 'REQUIRES_RESCHEDULE',
      ),
    ).toBe(true);
    expect(
      scheduleResponse.body.barbers[0].segments.some(
        (item: { state: string }) => item.state === 'DAY_OFF',
      ),
    ).toBe(true);
    expect(
      scheduleResponse.body.barbers[0].appointments.some(
        (item: { id: string; status: string }) =>
          item.id === bookingResponse.body.id &&
          item.status === 'REQUIRES_RESCHEDULE',
      ),
    ).toBe(true);
    expect(scheduleResponse.body.calendar.columns).toHaveLength(1);
    expect(scheduleResponse.body.calendar.columns[0].barberId).toBe(MARKO_BARBER_ID);
    expect(
      scheduleResponse.body.calendar.columns[0].items.some(
        (item: { type: string; dayOffId?: string }) =>
          item.type === 'DAY_OFF' && item.dayOffId === dayOffResponse.body.id,
      ),
    ).toBe(true);
    expect(scheduleResponse.body.calendar.timeAxis.length).toBeGreaterThan(0);

    const weekResponse = await request(app.getHttpServer())
      .get('/api/v1/admin/schedule/week')
      .set('Authorization', `Bearer ${adminLoginResponse.body.accessToken}`)
      .query({
        startDate: customerSlot.date,
        barberId: MARKO_BARBER_ID,
      })
      .expect(200);

    expect(weekResponse.body.startDate).toBe(customerSlot.date);
    expect(weekResponse.body.days).toHaveLength(7);
    expect(weekResponse.body.calendar.columns).toHaveLength(1);
    expect(weekResponse.body.calendar.days).toHaveLength(7);
    expect(
      weekResponse.body.days.some(
        (day: {
          date: string;
          barbers: Array<{ summary: { requiresRescheduleSegments: number } }>;
        }) =>
          day.date === customerSlot.date &&
          day.barbers[0]?.summary.requiresRescheduleSegments > 0,
      ),
    ).toBe(true);
    expect(
      weekResponse.body.calendar.days.some(
        (day: {
          date: string;
          cells: Array<{ hasDayOff: boolean; summary: { requiresRescheduleSegments: number } }>;
        }) =>
          day.date === customerSlot.date &&
          day.cells[0]?.hasDayOff === true &&
          day.cells[0]?.summary.requiresRescheduleSegments > 0,
      ),
    ).toBe(true);

    const deleteResponse = await request(app.getHttpServer())
      .delete(`/api/v1/admin/barbers/${MARKO_BARBER_ID}/day-off/${dayOffResponse.body.id}`)
      .set('Authorization', `Bearer ${adminLoginResponse.body.accessToken}`)
      .expect(200);

    expect(deleteResponse.body.success).toBe(true);
  });

  it('allows barber to block own time and force reschedule on overlapping booking', async () => {
    const customerPhoneNumber = `+38169${Date.now().toString().slice(-6)}`;

    const customerLoginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/customer/login')
      .send({
        phoneNumber: customerPhoneNumber,
        firstName: 'Blocked',
        lastName: 'Customer',
      })
      .expect(201);

    const customerSlot = await findFirstAvailableSlot({
      app,
      barberId: NIKOLA_BARBER_ID,
      barberServiceId: NIKOLA_COMBO_BARBER_SERVICE_ID,
      startDayOffset: 6,
    });

    const bookingResponse = await request(app.getHttpServer())
      .post('/api/v1/customer/appointments')
      .set('Authorization', `Bearer ${customerLoginResponse.body.accessToken}`)
      .send({
        barberId: NIKOLA_BARBER_ID,
        barberServiceId: NIKOLA_COMBO_BARBER_SERVICE_ID,
        startAt: customerSlot.startAt,
      })
      .expect(201);

    const barberLoginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/staff/login')
      .send({
        email: 'nikola@downtownbarber.rs',
        password: 'Barber123!',
      })
      .expect(201);

    const blockedSlotResponse = await request(app.getHttpServer())
      .post('/api/v1/barber/blocked-slots')
      .set('Authorization', `Bearer ${barberLoginResponse.body.accessToken}`)
      .send({
        startAt: customerSlot.startAt,
        endAt: customerSlot.endAt,
        reasonType: 'BREAK',
        note: 'Emergency break',
      })
      .expect(201);

    expect(blockedSlotResponse.body.barberId).toBe(NIKOLA_BARBER_ID);
    expect(blockedSlotResponse.body.impactedAppointments).toBeGreaterThanOrEqual(1);

    const customerListResponse = await request(app.getHttpServer())
      .get('/api/v1/customer/appointments')
      .set('Authorization', `Bearer ${customerLoginResponse.body.accessToken}`)
      .expect(200);

    const impactedAppointment = customerListResponse.body.find(
      (item: { id: string }) => item.id === bookingResponse.body.id,
    );

    expect(impactedAppointment).toBeDefined();
    expect(impactedAppointment.status).toBe('REQUIRES_RESCHEDULE');

    const scheduleResponse = await request(app.getHttpServer())
      .get('/api/v1/barber/schedule/day')
      .set('Authorization', `Bearer ${barberLoginResponse.body.accessToken}`)
      .query({
        date: customerSlot.date,
      })
      .expect(200);

    expect(scheduleResponse.body.date).toBe(customerSlot.date);
    expect(scheduleResponse.body.barbers).toHaveLength(1);
    expect(scheduleResponse.body.barbers[0].barberId).toBe(NIKOLA_BARBER_ID);
    expect(scheduleResponse.body.barbers[0].summary.totalSegments).toBeGreaterThan(0);
    expect(
      scheduleResponse.body.barbers[0].summary.requiresRescheduleSegments,
    ).toBeGreaterThan(0);
    expect(
      scheduleResponse.body.barbers[0].blockedSlots.some(
        (item: { id: string }) => item.id === blockedSlotResponse.body.id,
      ),
    ).toBe(true);
    expect(
      scheduleResponse.body.barbers[0].segments.some(
        (item: { blockedSlotId?: string; state: string }) =>
          item.blockedSlotId === blockedSlotResponse.body.id ||
          item.state === 'REQUIRES_RESCHEDULE',
      ),
    ).toBe(true);
    expect(
      scheduleResponse.body.barbers[0].appointments.some(
        (item: { id: string; status: string }) =>
          item.id === bookingResponse.body.id &&
          item.status === 'REQUIRES_RESCHEDULE',
      ),
    ).toBe(true);
    expect(scheduleResponse.body.calendar.columns).toHaveLength(1);
    expect(scheduleResponse.body.calendar.columns[0].barberId).toBe(NIKOLA_BARBER_ID);
    expect(
      scheduleResponse.body.calendar.columns[0].items.some(
        (item: { type: string; blockedSlotId?: string }) =>
          item.type === 'BLOCKED_SLOT' &&
          item.blockedSlotId === blockedSlotResponse.body.id,
      ),
    ).toBe(true);
    expect(scheduleResponse.body.calendar.timeAxis.length).toBeGreaterThan(0);

    const weekResponse = await request(app.getHttpServer())
      .get('/api/v1/barber/schedule/week')
      .set('Authorization', `Bearer ${barberLoginResponse.body.accessToken}`)
      .query({
        startDate: customerSlot.date,
      })
      .expect(200);

    expect(weekResponse.body.startDate).toBe(customerSlot.date);
    expect(weekResponse.body.days).toHaveLength(7);
    expect(weekResponse.body.calendar.columns).toHaveLength(1);
    expect(weekResponse.body.calendar.days).toHaveLength(7);
    expect(
      weekResponse.body.days.some(
        (day: {
          date: string;
          barbers: Array<{ summary: { requiresRescheduleSegments: number } }>;
        }) =>
          day.date === customerSlot.date &&
          day.barbers[0]?.summary.requiresRescheduleSegments > 0,
      ),
    ).toBe(true);
    expect(
      weekResponse.body.calendar.days.some(
        (day: {
          date: string;
          cells: Array<{
            blockedSlotCount: number;
            summary: { requiresRescheduleSegments: number };
          }>;
        }) =>
          day.date === customerSlot.date &&
          day.cells[0]?.blockedSlotCount > 0 &&
          day.cells[0]?.summary.requiresRescheduleSegments > 0,
      ),
    ).toBe(true);

    const deleteResponse = await request(app.getHttpServer())
      .delete(`/api/v1/barber/blocked-slots/${blockedSlotResponse.body.id}`)
      .set('Authorization', `Bearer ${barberLoginResponse.body.accessToken}`)
      .expect(200);

    expect(deleteResponse.body.success).toBe(true);
  });

  it('supports admin management endpoints for barbers, services and settings', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/staff/login')
      .send({
        email: 'admin@downtownbarber.rs',
        password: 'Admin123!',
      })
      .expect(201);

    const initialBarbersResponse = await request(app.getHttpServer())
      .get('/api/v1/admin/barbers')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .expect(200);

    expect(initialBarbersResponse.body.length).toBeGreaterThanOrEqual(1);

    const createBarberResponse = await request(app.getHttpServer())
      .post('/api/v1/admin/barbers')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .send({
        firstName: 'Milan',
        lastName: 'Demo',
        displayName: 'Milan Demo',
        level: 'Senior',
        bio: 'Admin-created barber for e2e.',
        photoUrl: 'https://example.com/milan.png',
        isActive: true,
        displayOrder: 99,
      })
      .expect(201);

    expect(createBarberResponse.body.displayName).toBe('Milan Demo');

    const updateBarberResponse = await request(app.getHttpServer())
      .patch(`/api/v1/admin/barbers/${createBarberResponse.body.id}`)
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .send({
        displayName: 'Milan Updated',
        displayOrder: 101,
      })
      .expect(200);

    expect(updateBarberResponse.body.displayName).toBe('Milan Updated');

    const createServiceResponse = await request(app.getHttpServer())
      .post('/api/v1/admin/services')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .send({
        name: `Classic Plus ${Date.now().toString().slice(-4)}`,
        description: 'Extended haircut package.',
        durationMinutes: 45,
        isActive: true,
        displayOrder: 99,
      })
      .expect(201);

    expect(createServiceResponse.body.durationMinutes).toBe(45);

    const updateServiceResponse = await request(app.getHttpServer())
      .patch(`/api/v1/admin/services/${createServiceResponse.body.id}`)
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .send({
        durationMinutes: 50,
      })
      .expect(200);

    expect(updateServiceResponse.body.durationMinutes).toBe(50);

    const pricingResponse = await request(app.getHttpServer())
      .put('/api/v1/admin/barber-services')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .send({
        items: [
          {
            barberId: createBarberResponse.body.id,
            serviceId: createServiceResponse.body.id,
            priceAmount: 2100,
            currency: 'RSD',
            durationOverrideMinutes: 55,
            isActive: true,
          },
        ],
      })
      .expect(200);

    expect(
      pricingResponse.body.some(
        (item: {
          barberId: string;
          serviceId: string;
          priceAmount: number;
          durationOverrideMinutes: number;
        }) =>
          item.barberId === createBarberResponse.body.id &&
          item.serviceId === createServiceResponse.body.id &&
          item.priceAmount === 2100 &&
          item.durationOverrideMinutes === 55,
      ),
    ).toBe(true);

    const salonSettingsResponse = await request(app.getHttpServer())
      .get('/api/v1/admin/settings/salon')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .expect(200);

    const updateSettingsResponse = await request(app.getHttpServer())
      .put('/api/v1/admin/settings/salon')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .send({
        brandName: `Downtown Premium ${Date.now().toString().slice(-3)}`,
        phone: salonSettingsResponse.body.phone,
        address: salonSettingsResponse.body.address,
        timezone: salonSettingsResponse.body.timezone,
        currency: salonSettingsResponse.body.currency,
        slotGranularityMinutes: salonSettingsResponse.body.slotGranularityMinutes,
        name: salonSettingsResponse.body.name,
        slug: salonSettingsResponse.body.slug,
        isActive: salonSettingsResponse.body.isActive,
      })
      .expect(200);

    expect(updateSettingsResponse.body.brandName).toContain('Downtown Premium');

    const workingHoursResponse = await request(app.getHttpServer())
      .get('/api/v1/admin/settings/working-hours')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .expect(200);

    expect(workingHoursResponse.body).toHaveLength(7);

    const saveWorkingHoursResponse = await request(app.getHttpServer())
      .put('/api/v1/admin/settings/working-hours')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .send({
        items: workingHoursResponse.body,
      })
      .expect(200);

    expect(saveWorkingHoursResponse.body).toHaveLength(7);
  });
});
