import { Injectable, Logger } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Inject } from '@nestjs/common';
import { Logger as WinstonLogger } from 'winston';

export enum AuditAction {
  LOGIN = 'LOGIN',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  REGISTER = 'REGISTER',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PROFILE_UPDATE = 'PROFILE_UPDATE',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  RATE_LIMIT_HIT = 'RATE_LIMIT_HIT',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  CSRF_BLOCKED = 'CSRF_BLOCKED',
  INVALID_INPUT = 'INVALID_INPUT',
}

export interface AuditLog {
  action: AuditAction;
  userId?: string;
  email?: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  details?: any;
  timestamp: Date;
  success: boolean;
}

@Injectable()
export class AuditService {
  private readonly logger: Logger;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly winstonLogger: WinstonLogger,
  ) {
    this.logger = new Logger(AuditService.name);
  }

  async log(auditLog: AuditLog): Promise<void> {
    const logMessage = {
      audit: true,
      action: auditLog.action,
      userId: auditLog.userId,
      email: auditLog.email,
      ip: auditLog.ip,
      userAgent: auditLog.userAgent,
      requestId: auditLog.requestId,
      details: auditLog.details,
      timestamp: auditLog.timestamp.toISOString(),
      success: auditLog.success,
    };

    // Log to Winston (will be written to audit log file if configured)
    if (auditLog.success) {
      this.winstonLogger.info(`[AUDIT] ${auditLog.action}`, logMessage);
    } else {
      this.winstonLogger.warn(`[AUDIT] ${auditLog.action}`, logMessage);
    }

    // Also log to console for immediate visibility
    this.logger.log(
      `[AUDIT] ${auditLog.action} - User: ${auditLog.userId || auditLog.email || 'Unknown'} - Success: ${auditLog.success}`,
    );
  }

  async logSecurityEvent(
    action: AuditAction,
    details: {
      userId?: string;
      email?: string;
      ip?: string;
      userAgent?: string;
      requestId?: string;
      [key: string]: any;
    },
    success: boolean = false,
  ): Promise<void> {
    await this.log({
      action,
      ...details,
      timestamp: new Date(),
      success,
    });
  }
}
