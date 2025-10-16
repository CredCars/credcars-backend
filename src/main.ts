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

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: corsConfig,
    bodyParser: true,
  });

  app.use(
    session({
      secret: 'your-secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 3600000,
        secure: configuration().nodeEnv === 'production',
      },
    }),
  );

  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalPipes(new ValidationPipe());

  app.use(express.static(path.join(__dirname, '/')));

  app.enableCors({
    origin: configuration().allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders:
      'Content-Type, Accept, Access-Control-Allow-Origin, Authorization',
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Your API Title')
    .setDescription(
      'Your API description. Note: Authentication routes are rate-limited to prevent brute force attacks.',
    )
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);

  app.useGlobalFilters(new HttpExceptionFilter(logger));
  app.useLogger(logger);

  const port = process.env.PORT || configuration().port || 8080;
  await app.listen(port, '0.0.0.0');
  console.log(`App is running on port ${port}`);
}

bootstrap();
