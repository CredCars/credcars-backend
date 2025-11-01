import { createLogger } from 'winston';
import { winstonConfig } from './logger.config';
import { productionWinstonConfig } from './logger.config.production';

describe('Logger Config', () => {
  it('should create a dev logger', () => {
    const logger = createLogger(winstonConfig);
    expect(logger).toBeDefined();
  });

  it('should create a prod logger', () => {
    const logger = createLogger(productionWinstonConfig());
    expect(logger).toBeDefined();
  });
});
