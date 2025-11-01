import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Logger } from 'winston';
import configuration from '@config/configuration';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const isProduction = configuration().nodeEnv === 'production';

    // Get error message
    let message: any =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // Sanitize error messages in production
    if (isProduction && status === HttpStatus.INTERNAL_SERVER_ERROR) {
      message = 'Internal server error';
    }

    // Extract request ID if available
    const requestId = (request as any).id || 'unknown';

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
      message:
        isProduction && status === HttpStatus.INTERNAL_SERVER_ERROR
          ? 'Internal server error'
          : message,
      // Only include error details in development
      ...(!isProduction && {
        error: exception instanceof Error ? exception.message : 'Unknown error',
      }),
    };

    // Log with request ID and sanitized information
    this.logger.error(`${request.method} ${request.url}`, {
      requestId,
      statusCode: status,
      error: exception instanceof Error ? exception.message : 'Unknown error',
      stack: isProduction
        ? undefined
        : exception instanceof Error
          ? exception.stack
          : 'No stack trace',
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });

    response.status(status).json(errorResponse);
  }
}
