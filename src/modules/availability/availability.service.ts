import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { calculateAvailability } from './availability.engine';
import { AvailabilityRepository } from './availability.repository';
import { addDaysToLocalDate, getTodayInTimeZone } from './availability.timezone';
import {
  GetBarberAvailabilityInput,
  GetBarberAvailabilityResult,
} from './availability.types';

@Injectable()
export class AvailabilityService {
  constructor(private readonly availabilityRepository: AvailabilityRepository) {}

  async getBarberAvailability(
    input: GetBarberAvailabilityInput,
  ): Promise<GetBarberAvailabilityResult> {
    const context = await this.availabilityRepository.getBarberAvailabilityContext(
      input,
    );

    if (!context) {
      throw new NotFoundException('Barber ili usluga nisu pronadjeni.');
    }

    if (context.barberService.barberId !== input.barberId) {
      throw new UnprocessableEntityException(
        'Izabrana usluga ne pripada trazenom barberu.',
      );
    }

    const todayInSalonTime = getTodayInTimeZone(context.salon.timezone);
    const lastBookableDate = addDaysToLocalDate(todayInSalonTime, 14);

    if (input.date < todayInSalonTime || input.date > lastBookableDate) {
      throw new UnprocessableEntityException(
        'Datum je van dozvoljenog booking horizonta.',
      );
    }

    return calculateAvailability({
      input,
      context,
    });
  }
}
