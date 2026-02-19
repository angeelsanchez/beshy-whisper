import { cleanAllTestData } from './utils/db-helpers';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

function cleanTempProfiles(): void {
  const tmpDir = os.tmpdir();
  try {
    const entries = fs.readdirSync(tmpDir);
    for (const entry of entries) {
      if (entry.startsWith('rust_mozprofile') || entry.startsWith('playwright')) {
        fs.rmSync(path.join(tmpDir, entry), { recursive: true, force: true });
      }
    }
  } catch {
    // Ignore cleanup errors
  }
}

async function globalTeardown(): Promise<void> {
  await cleanAllTestData();
  cleanTempProfiles();
}

export default globalTeardown;
