import {
  Global,
  Inject,
  Module,
  OnApplicationShutdown,
} from '@nestjs/common';
import { Pool } from 'pg';

import { DATABASE_POOL } from './database.constants';
import { getDatabasePoolConfig } from './database.config';

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_POOL,
      useFactory: () => new Pool(getDatabasePoolConfig()),
    },
  ],
  exports: [DATABASE_POOL],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown() {
    await this.pool.end();
  }
}
