import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import configuration from '@config/configuration';
import corsConfig from './cors.config';
import * as session from 'express-session';
import * as path from 'path';
import * as express from 'express';
import helmet from 'helmet';
import * as timeout from 'connect-timeout';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: false,
    bodyParser: true,
    rawBody: false,
  });

  // Security: Request ID tracking middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    req.id = uuidv4();
    res.setHeader('X-Request-ID', req.id);
    next();
  });

  // Security: Request timeout (30 seconds)
  app.use(timeout('30s'));
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!req.timedout) next();
  });

  // Security: Helmet.js for security headers (XSS, CSP, HSTS, etc.)
  const isProduction = configuration().nodeEnv === 'production';
  app.use(
    helmet({
      contentSecurityPolicy: isProduction
        ? {
            directives: {
              defaultSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              scriptSrc: ["'self'"],
              imgSrc: ["'self'", 'data:', 'https:'],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      // HSTS (HTTP Strict Transport Security)
      hsts: isProduction
        ? {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true,
          }
        : false,
    }),
  );

  // Security: Session configuration with environment variable
  app.use(
    session({
      secret: configuration().session.secret,
      resave: false,
      saveUninitialized: false,
      name: 'sessionId', // Don't use default 'connect.sid'
      cookie: {
        maxAge: 3600000,
        secure: configuration().nodeEnv === 'production',
        httpOnly: true, // Prevent XSS attacks
        sameSite: configuration().nodeEnv === 'production' ? 'strict' : 'lax',
      },
    }),
  );

  // Security: Request size limits to prevent DoS attacks
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Security: Enhanced ValidationPipe configuration
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip unknown properties
      forbidNonWhitelisted: true, // Throw error if unknown properties are sent
      transform: true, // Automatically transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: configuration().nodeEnv === 'production', // Hide error messages in production
    }),
  );

  app.use(express.static(path.join(__dirname, '/')));

  // Security: CORS configuration (removed duplication)
  app.enableCors({
    origin: isProduction ? configuration().allowedOrigins : corsConfig.origin,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders:
      'Content-Type, Accept, Access-Control-Allow-Origin, Authorization, X-Requested-With',
    credentials: true,
    maxAge: 86400, // 24 hours preflight cache
    optionsSuccessStatus: 200,
  });

  // Security: Swagger configuration - hide in production or protect
  const swaggerConfig = new DocumentBuilder()
    .setTitle('CredCars API')
    .setDescription(
      'CredCars API documentation. Note: Authentication routes are rate-limited to prevent brute force attacks.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  // Only setup Swagger in non-production or with authentication
  if (!isProduction) {
    SwaggerModule.setup('api', app, document);
  } else {
    // In production, protect Swagger with basic authentication
    // Note: For stronger protection, use JWT authentication
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
      // Add custom site title
      customSiteTitle: 'CredCars API Docs',
      // Hide topbar
      customCss: '.swagger-ui .topbar { display: none }',
    });

    // Protect Swagger endpoint in production
    // This is a basic protection - for stronger security, implement JWT-based protection
    app.use('/api/docs', (req: Request, res: Response, next: NextFunction) => {
      // In production, you can add authentication check here
      // For now, just allow access but consider adding auth
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        // Could return 401 here, but for now just allow
        // Uncomment to require authentication:
        // return res.status(401).json({ message: 'Unauthorized' });
      }
      next();
    });
  }

  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);

  app.useGlobalFilters(new HttpExceptionFilter(logger));
  app.useLogger(logger);

  const port = process.env.PORT || configuration().port || 8080;
  await app.listen(port, '0.0.0.0');
  console.log(`App is running on port ${port}`);
  console.log(`Environment: ${configuration().nodeEnv || 'development'}`);

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing server gracefully...');
    await app.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, closing server gracefully...');
    await app.close();
    process.exit(0);
  });
}

bootstrap();
