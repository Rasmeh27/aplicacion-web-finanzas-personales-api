import { join } from 'path';

/**
 * Absolute path to this service's .env file.
 *
 * `__dirname` points to `src/config` under ts-jest and to `dist/config` after
 * compilation, so walking up twice is stable regardless of process.cwd().
 */
export const BACKEND_ENV_FILE = join(__dirname, '..', '..', '.env');
