// jest.setup.ts
import * as dotenv from 'dotenv';
import * as path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

// Fallbacks (useful for local test runs)
process.env.NODE_ENV ||= 'test';
process.env.JWT_SECRET ||= 'testsecret';
process.env.JWT_REFRESH_SECRET ||= 'testsecret';
process.env.JWT_EXPIRES_IN ||= '15m';
process.env.JWT_REFRESH_EXPIRES_IN ||= '7d';
process.env.MONGODB_URI ||= 'mongodb://localhost:27017/test-db';
process.env.ALLOWED_ORIGINS ||= 'http://localhost:3000';
process.env.FRONTEND_URL ||= 'http://localhost:3000';
