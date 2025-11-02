import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';
import { Logger } from 'winston';

describe('HttpExceptionFilter', () => {
  it('should catch HttpException and log it', () => {
    const mockLogger = {
      error: jest.fn(),
    } as unknown as Logger;

    const filter = new HttpExceptionFilter(mockLogger);

    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => ({
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        }),
        getRequest: () => ({
          url: '/test',
          method: 'GET',
          ip: '127.0.0.1',
          headers: {
            'user-agent': 'jest-test-agent',
          },
        }),
      }),
    } as unknown as ArgumentsHost;

    const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    filter.catch(exception, mockHost);

    // optional: verify logger was called
    expect(mockLogger.error).toHaveBeenCalled();
  });
});
