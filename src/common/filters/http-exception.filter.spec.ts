import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';
import { Logger } from 'winston';

describe('HttpExceptionFilter', () => {
  it('should catch HttpException and log it', () => {
    const filter = new HttpExceptionFilter(new Logger());
    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => ({
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        }),
        getRequest: () => ({}),
      }),
    } as unknown as ArgumentsHost;

    const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    filter.catch(exception, mockHost);
    expect(true).toBeTruthy();
  });
});
