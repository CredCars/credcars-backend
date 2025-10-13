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
}

export default (): Configuration => ({
  port: parseInt(process.env.PORT, 10) || 8080,
  database: {
    uri: process.env.MONGODB_URI,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  },
  nodeEnv: process.env.NODE_ENV,
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [],
});
