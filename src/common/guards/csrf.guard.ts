import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import configuration from '@config/configuration';
import { AuditService, AuditAction } from '../services/audit.service';

/**
 * CSRF Guard for REST APIs
 * For stateless REST APIs using JWT, we use Origin/Referer validation
 * and require custom headers as a CSRF mitigation strategy.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly logger = new Logger(CsrfGuard.name);

  constructor(private readonly auditService: AuditService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;

    // Only protect state-changing methods
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return true;
    }

    // Skip CSRF check for same-origin requests (if applicable)
    // In development, be more lenient
    const isProduction = configuration().nodeEnv === 'production';

    if (!isProduction) {
      // In development, allow localhost requests
      const origin = request.get('origin');
      if (
        origin &&
        (origin.includes('localhost') || origin.includes('127.0.0.1'))
      ) {
        return true;
      }
    }

    // Strategy 1: Validate Origin header
    const origin = request.get('origin');
    const allowedOrigins = configuration().allowedOrigins || [];

    if (origin) {
      // Check if origin is in allowed list
      // configuration().allowedOrigins is always string[] from env variables
      const isAllowed = allowedOrigins.some((allowedOrigin) => {
        if (typeof allowedOrigin === 'string') {
          return (
            origin === allowedOrigin ||
            origin.startsWith(allowedOrigin) ||
            origin.includes(allowedOrigin)
          );
        }
        return false;
      });

      if (!isAllowed && isProduction) {
        // Audit CSRF blocked attempt
        const requestId = (request as any).id;
        const ip = request.ip || (request as any).ips?.[0];
        const userAgent = request.headers['user-agent'];
        await this.auditService.logSecurityEvent(
          AuditAction.CSRF_BLOCKED,
          {
            ip,
            userAgent,
            requestId,
            details: {
              origin,
              path: request.url,
              method: request.method,
            },
          },
          false,
        );

        this.logger.warn(
          `CSRF blocked: Origin ${origin} not allowed for ${request.method} ${request.url}`,
        );

        throw new ForbiddenException(
          'CSRF validation failed: Origin not allowed',
        );
      }
    }

    // Strategy 2: Require custom header (additional layer)
    // Browsers enforce same-origin policy for custom headers
    const customHeader = request.get('x-requested-with');
    if (isProduction && !customHeader) {
      // This is a soft check - we log but don't block in case of legitimate API clients
      // For stricter enforcement, uncomment the exception:
      // throw new ForbiddenException('CSRF validation failed: Missing required header');
      this.logger.debug(
        `Missing X-Requested-With header for ${request.method} ${request.url}`,
      );
    }

    return true;
  }
}
