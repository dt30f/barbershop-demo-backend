# Backend

Ovo je NestJS-oriented backend skeleton za MVP module:
- `availability`
- `appointments`

Napomene:
- Ovo jos nije pun proizvodni backend.
- `auth` modul sada pokriva customer login/refresh/logout/profile i staff login/refresh/logout.
- `availability` service ima implementiran domain flow i konkretan PostgreSQL repository.
- `appointments` service ima implementiran orchestration flow za create/list/cancel/update i konkretan PostgreSQL repository.
- `schedule` modul sada pokriva admin/barber write flow za `day off` i `blocked slot`, ukljucujuci automatski `REQUIRES_RESCHEDULE` update i `IN_APP` notification zapis za pogodjene termine.
- day/week schedule read payload sada vraca slot-level `summary` i `segments` po barberu, plus `calendar.timeAxis`, `calendar.columns` i week `calendar.days` shape za laksi web admin rendering.
- Baza se konektuje preko `pg` pool-a i `DATABASE_URL` ili `DB_*` env promenljivih.
- White-label salon context u ovom MVP/dev koraku dolazi iz `APP_SALON_ID` env promenljive ili iz `x-salon-id` header-a.
- Za zasticene rute backend prvo pokusava Bearer access token, pa tek onda dev header fallback `x-customer-id`, `x-admin-user-id`, `x-barber-id`.
- DTO fajlovi, odgovori i struktura foldera prate `BACKEND_CONTRACT_AVAILABILITY_APPOINTMENTS.md`.

Lokalni start, kada se instaliraju paketi:
- `npm install`
- `npm run start:dev`
- `npm run test:e2e`

MVP auth rute:
- `POST /api/v1/auth/customer/login`
- `POST /api/v1/auth/customer/refresh`
- `POST /api/v1/auth/customer/logout`
- `GET /api/v1/auth/customer/me`
- `POST /api/v1/auth/staff/login`
- `POST /api/v1/auth/staff/refresh`
- `POST /api/v1/auth/staff/logout`
- `POST /api/v1/admin/barbers/:barberId/day-off`
- `DELETE /api/v1/admin/barbers/:barberId/day-off/:dayOffId`
- `POST /api/v1/admin/barbers/:barberId/blocked-slots`
- `DELETE /api/v1/admin/barbers/:barberId/blocked-slots/:blockedSlotId`
- `GET /api/v1/admin/appointments?dateFrom?=YYYY-MM-DD&dateTo?=YYYY-MM-DD&barberId?=uuid&status?=CONFIRMED&customerPhone?=partial&page?=1&pageSize?=20&sortBy?=START_AT&sortDirection?=ASC`
- `GET /api/v1/admin/schedule/day?date=YYYY-MM-DD&barberId?=uuid`
- `GET /api/v1/admin/schedule/week?startDate=YYYY-MM-DD&barberId?=uuid`
- `POST /api/v1/barber/day-off`
- `DELETE /api/v1/barber/day-off/:dayOffId`
- `POST /api/v1/barber/blocked-slots`
- `DELETE /api/v1/barber/blocked-slots/:blockedSlotId`
- `GET /api/v1/barber/schedule/day?date=YYYY-MM-DD`
- `GET /api/v1/barber/schedule/week?startDate=YYYY-MM-DD`

Demo staff kredencijali posle svih migracija:
- `admin@downtownbarber.rs` / `Admin123!`
- `nikola@downtownbarber.rs` / `Barber123!`

Potrebne env promenljive:
- `DATABASE_URL` ili `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `APP_SALON_ID` za fiksni white-label deployment context, ili alternativno `x-salon-id` header tokom razvoja
- `AUTH_ACCESS_TOKEN_SECRET` i `AUTH_REFRESH_TOKEN_SECRET` za bezbednije tokene van lokalnog razvoja
- opciono `DB_POOL_MAX`

Sledeci preporuceni koraci:
- prosiriti e2e pokrivenost na overlap i 24h cancellation edge-case
- krenuti na admin app day calendar UI i appointments table, jer backend sada vec ima pagination/sort i week/day calendar payload spreman za frontend
- uvesti notification scheduling worker
- zameniti dev header fallback pravim auth guard-ovima kada MVP auth bude finalizovan
