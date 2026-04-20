import { PoolConfig } from 'pg';

function parseInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function getDatabasePoolConfig(
  env: NodeJS.ProcessEnv = process.env,
): PoolConfig {
  const max = parseInteger(env.DB_POOL_MAX, 10);
  const ssl = env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined;

  if (env.DATABASE_URL) {
    return {
      connectionString: env.DATABASE_URL,
      max,
      ssl,
    };
  }

  return {
    host: env.DB_HOST ?? 'localhost',
    port: parseInteger(env.DB_PORT, 5432),
    database: env.DB_NAME ?? 'barber_booking',
    user: env.DB_USER ?? 'postgres',
    password: env.DB_PASSWORD ?? '1234',
    max,
    ssl,
  };
}
