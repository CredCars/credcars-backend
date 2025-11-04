import * as dotenv from 'dotenv';
dotenv.config();
export interface Configuration {
  port: number;
  database: {
    uri: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  nodeEnv: string;
  allowedOrigins: string[];
  session: {
    secret: string;
  };
}

// Validate required environment variables at startup
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];

const nodeEnv = process.env.NODE_ENV;

// In production, require SESSION_SECRET too
if (nodeEnv === 'production') {
  requiredEnvVars.push('SESSION_SECRET');
}

requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    console.log(`${varName}, ${process.env[varName]}`);

    throw new Error(
      `Missing required environment variable: ${varName}. Please set it in your .env file or environment.`,
    );
  }
});

// Warn about weak session secret in production
if (
  nodeEnv === 'production' &&
  process.env.SESSION_SECRET === 'change-me-in-production'
) {
  console.warn(
    '⚠️  WARNING: Using default SESSION_SECRET in production. This is insecure!',
  );
}

export default (): Configuration => ({
  port: parseInt(process.env.PORT, 10) || 8080,
  database: {
    uri: process.env.MONGODB_URI,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  nodeEnv: process.env.NODE_ENV || 'development',
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [],
  session: {
    secret: process.env.SESSION_SECRET || 'change-me-in-production',
  },
});
