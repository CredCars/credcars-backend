import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';
import WinstonCloudWatch from 'winston-cloudwatch';
import configuration from '@config/configuration';

// Structured JSON format for production
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// Human-readable format for console (development)
const consoleFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.colorize(),
  winston.format.simple(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return `[${timestamp}] ${level}: ${message} ${
      Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
    }`;
  }),
);

export const productionWinstonConfig = (): WinstonModuleOptions => {
  const isProduction = configuration().nodeEnv === 'production';
  const transports: winston.transport[] = [];

  // Console transport (always active)
  transports.push(
    new winston.transports.Console({
      format: isProduction ? jsonFormat : consoleFormat,
      level: isProduction ? 'info' : 'debug',
    }),
  );

  // File transports for local logging (backup)
  if (isProduction) {
    // Error logs only
    transports.push(
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: jsonFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
    );

    // Combined logs
    transports.push(
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: jsonFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
    );

    // Audit logs (separate file for security events)
    transports.push(
      new winston.transports.File({
        filename: 'logs/audit.log',
        format: jsonFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 10, // Keep more audit logs
      }),
    );
  }

  // CloudWatch transport for production
  if (isProduction && process.env.AWS_REGION) {
    const appName = process.env.APP_NAME || 'credcars-backend';
    const env = process.env.NODE_ENV || 'production';

    // Error logs to CloudWatch
    transports.push(
      new WinstonCloudWatch({
        logGroupName: `/aws/elasticbeanstalk/${appName}/${env}`,
        logStreamName: 'errors',
        awsRegion: process.env.AWS_REGION,
        level: 'error',
        messageFormatter: ({ level, message, ...meta }) => {
          return JSON.stringify({
            level,
            message,
            ...meta,
            timestamp: new Date().toISOString(),
          });
        },
        // Batch logs for efficiency
        jsonMessage: true,
      }),
    );

    // Application logs to CloudWatch
    transports.push(
      new WinstonCloudWatch({
        logGroupName: `/aws/elasticbeanstalk/${appName}/${env}`,
        logStreamName: 'application',
        awsRegion: process.env.AWS_REGION,
        level: 'info',
        messageFormatter: ({ level, message, ...meta }) => {
          return JSON.stringify({
            level,
            message,
            ...meta,
            timestamp: new Date().toISOString(),
          });
        },
        jsonMessage: true,
      }),
    );

    // Audit logs to CloudWatch (separate stream)
    transports.push(
      new WinstonCloudWatch({
        logGroupName: `/aws/elasticbeanstalk/${appName}/${env}`,
        logStreamName: 'audit',
        awsRegion: process.env.AWS_REGION,
        level: 'info', // Audit logs can be info or warn
        messageFormatter: ({ level, message, ...meta }) => {
          // Only send audit logs
          if (meta.audit) {
            return JSON.stringify({
              level,
              message,
              ...meta,
              timestamp: new Date().toISOString(),
            });
          }
          return null; // Don't send non-audit logs to this stream
        },
        jsonMessage: true,
      }),
    );
  }

  return {
    levels: winston.config.npm.levels,
    level: isProduction ? 'info' : 'debug',
    transports,
    // Handle uncaught exceptions
    exceptionHandlers: isProduction
      ? [
          new winston.transports.File({
            filename: 'logs/exceptions.log',
            format: jsonFormat,
          }),
        ]
      : [new winston.transports.Console()],
    // Handle unhandled promise rejections
    rejectionHandlers: isProduction
      ? [
          new winston.transports.File({
            filename: 'logs/rejections.log',
            format: jsonFormat,
          }),
        ]
      : [new winston.transports.Console()],
  };
};
