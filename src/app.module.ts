import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './logger/logger.config';
import { productionWinstonConfig } from './logger/logger.config.production';
import { UtilModule } from './util/util.module';
import configuration from '@config/configuration';
import { Logger } from '@nestjs/common';
import { CsrfGuard } from './common/guards/csrf.guard';
import { CommonModule } from './common/common.module';

const imports = [
  CommonModule,
  ConfigModule.forRoot({
    isGlobal: true,
    load: [configuration],
  }),
  JwtModule.registerAsync({
    imports: [ConfigModule],
    useFactory: async () => ({
      secret: configuration().jwt.secret,
      signOptions: { expiresIn: configuration().jwt.expiresIn },
    }),
  }),
  ThrottlerModule.forRoot([
    {
      name: 'short',
      ttl: 60000, // 1 minute
      limit: 100, // 100 requests per minute (more lenient for general endpoints)
    },
    {
      name: 'long',
      ttl: 3600000, // 1 hour
      limit: 1000, // 1000 requests per hour
    },
    {
      name: 'strict', // For sensitive endpoints like auth
      ttl: 60000,
      limit: 5,
    },
  ]),
  UserModule,
  AuthModule,
  WinstonModule.forRoot(
    configuration().nodeEnv === 'production'
      ? productionWinstonConfig()
      : winstonConfig,
  ),
  UtilModule,
];

if (configuration().nodeEnv !== 'test') {
  imports.push(
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async () => {
        const env = configuration().nodeEnv;

        if (env === 'test') {
          return {
            uri: '',
          };
        }

        const isProduction = configuration().nodeEnv === 'production';
        return {
          uri: configuration().database.uri,
          // Connection pooling
          maxPoolSize: 10,
          minPoolSize: 2,
          // Timeouts
          connectTimeoutMS: 30000,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
          // Retry configuration
          retryWrites: true,
          retryReads: true,
          // Security options for production
          ...(isProduction && {
            ssl: true,
            sslValidate: true,
            sslCA: undefined, // MongoDB Atlas handles this automatically
          }),
        };
      },
    }),
  );
}

@Module({
  imports: imports,
  controllers: [AppController],
  providers: [
    AppService,
    Logger,
    // Security: Global rate limiting guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Security: Global CSRF guard
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
  ],
})
export class AppModule {}
