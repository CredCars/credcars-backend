import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';

const customLogFormat = winston.format.printf(
  ({ timestamp, level, message, ...meta }) => {
    return `[${timestamp}] ${level}: ${message} ${
      Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
    }`;
  },
);

export const winstonConfig: WinstonModuleOptions = {
  levels: winston.config.npm.levels,
  level: 'info',
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.simple(),
        winston.format((info) => {
          if (
            info.context &&
            [
              'InstanceLoader',
              'RoutesResolver',
              'RouterExplorer',
              'NestFactory',
              'NestApplication',
            ].includes(info.context)
          ) {
            return false;
          }
          return info;
        })(),
        customLogFormat,
      ),
    }),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
};
