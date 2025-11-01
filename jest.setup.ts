// jest.setup.ts
import * as dotenv from 'dotenv';
import * as path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

// Fallbacks (useful for local test runs)
process.env.NODE_ENV ||= 'test';
process.env.JWT_SECRET ||= 'testsecret';
process.env.MONGODB_URI ||= 'mongodb://localhost:27017/test-db';
