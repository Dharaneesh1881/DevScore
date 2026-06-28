/**
 * Run once to create the initial platform admin account.
 * Usage: node --experimental-vm-modules backend/scripts/seedPlatformAdmin.js
 * Or via: cd backend && node scripts/seedPlatformAdmin.js
 */
import 'dotenv/config';
import { masterConnection } from '../db/masterDb.js';
import PlatformAdmin from '../models/master/PlatformAdmin.js';

const EMAIL    = process.env.PLATFORM_ADMIN_EMAIL    || 'admin@devscore.io';
const PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'AdminPass123';
const NAME     = process.env.PLATFORM_ADMIN_NAME     || 'Platform Admin';

await masterConnection.asPromise();

const existing = await PlatformAdmin.findOne({ email: EMAIL });
if (existing) {
  console.log(`Platform admin already exists: ${EMAIL}`);
  process.exit(0);
}

const passwordHash = await PlatformAdmin.hashPassword(PASSWORD);
await PlatformAdmin.create({ name: NAME, email: EMAIL, passwordHash });
console.log(`Platform admin created: ${EMAIL} / ${PASSWORD}`);
process.exit(0);
