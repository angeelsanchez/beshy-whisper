import { cleanAllTestData } from './utils/db-helpers';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function globalTeardown(): Promise<void> {
  await cleanAllTestData();
}

export default globalTeardown;
