import { entities } from '../entities';

type EnvMap = Record<string, string | undefined>;

function readBoolean(value: string | undefined, defaultValue: boolean) {
  if (value == null || value === '') return defaultValue;
  return value === 'true';
}

function readPort(value: string | undefined, defaultValue: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

export function createDatabaseOptions(env: EnvMap = process.env) {
  const dbType = env.DB_TYPE || 'sqlite';

  if (dbType === 'mysql') {
    return {
      type: 'mysql' as const,
      host: env.DB_HOST || '127.0.0.1',
      port: readPort(env.DB_PORT, 3306),
      username: env.DB_USER || '',
      password: env.DB_PASSWORD || '',
      database: env.DB_NAME || '',
      entities,
      synchronize: readBoolean(env.DB_SYNC, false),
      logging: readBoolean(env.DB_LOGGING, false),
    };
  }

  return {
    type: 'sqljs' as const,
    autoSave: true,
    location: env.DB_DATABASE || './dev.db',
    entities,
    synchronize: readBoolean(env.DB_SYNC, true),
    logging: readBoolean(env.DB_LOGGING, false),
  };
}
