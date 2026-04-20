import { Matches } from 'class-validator';

export function IsAppUuid() {
  return Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
    message: 'Value must be a valid app UUID.',
  });
}
