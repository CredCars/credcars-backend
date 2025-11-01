import {
  Injectable,
  Logger,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '@user/user.service';
import * as bcrypt from 'bcryptjs';
import { LoginUserDTO } from '@auth/dto';
import { CreateUserDTO } from '@user/dto';
import { UserDocument } from '@user/schema/user.schema';
import configuration from '@config/configuration';
import { AuditService, AuditAction } from '@common/services/audit.service';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private readonly logger: Logger,
    private readonly auditService: AuditService,
  ) {}

  async register(
    body: CreateUserDTO,
    ip?: string,
    userAgent?: string,
    requestId?: string,
  ): Promise<UserDocument> {
    this.logger.log(`Registering user with email: ${body.email}`);
    try {
      const user = await this.userService.create(body.email, body.password);
      // Audit successful registration
      await this.auditService.logSecurityEvent(
        AuditAction.REGISTER,
        {
          userId: user.id.toString(),
          email: user.email,
          ip,
          userAgent,
          requestId,
        },
        true,
      );
      return user;
    } catch (error) {
      // Audit failed registration
      await this.auditService.logSecurityEvent(
        AuditAction.REGISTER,
        {
          email: body.email,
          ip,
          userAgent,
          requestId,
          details: { error: error.message },
        },
        false,
      );
      throw error;
    }
  }

  async login(
    body: LoginUserDTO,
    ip?: string,
    userAgent?: string,
    requestId?: string,
  ): Promise<
    { tokens: { accessToken: string; refreshToken: string } } | Error
  > {
    this.logger.log(`Logging in user with email: ${body.email}`);

    const user = await this.userService.findByEmail(body.email);

    if (!user || !(await bcrypt.compare(body.password, user.password))) {
      this.logger.error(`Invalid credentials for user: ${body.email}`);
      // Audit failed login attempt
      await this.auditService.logSecurityEvent(
        AuditAction.LOGIN_FAILED,
        {
          email: body.email,
          ip,
          userAgent,
          requestId,
          details: { reason: 'Invalid credentials' },
        },
        false,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.log(`User logged in successfully: ${user.email}`);
    const tokens = await this.getTokens(user.id.toString(), user.email);
    this.logger.debug(`Created refresh token: ${tokens.refreshToken}`);

    await this.updateRefreshToken(user.id.toString(), tokens.refreshToken);

    // Audit successful login
    await this.auditService.logSecurityEvent(
      AuditAction.LOGIN,
      {
        userId: user.id.toString(),
        email: user.email,
        ip,
        userAgent,
        requestId,
      },
      true,
    );

    return {
      tokens,
    };
  }

  async logout(
    userId: string,
    ip?: string,
    userAgent?: string,
    requestId?: string,
  ) {
    this.logger.log(`Logging out user: ${userId}`);
    await this.userService.update(userId, { refreshToken: null });
    this.logger.log(`User logged out successfully: ${userId}`);
    // Audit logout
    await this.auditService.logSecurityEvent(
      AuditAction.LOGOUT,
      {
        userId,
        ip,
        userAgent,
        requestId,
      },
      true,
    );
  }

  async refreshTokens(
    userId: string,
    refreshToken: string,
    ip?: string,
    userAgent?: string,
    requestId?: string,
  ) {
    this.logger.log(`Refreshing tokens for user: ${userId}`);
    const user = await this.userService.findById(userId);
    if (!user || !user.refreshToken) {
      this.logger.error(`User not found or refresh token missing: ${userId}`);
      throw new ForbiddenException('Access Denied');
    }

    if (!refreshToken) {
      this.logger.error(`Invalid refresh token: ${userId}`);
      throw new UnauthorizedException('Invalid refresh token');
    }

    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      user.refreshToken,
    );
    if (!refreshTokenMatches) {
      this.logger.error(`Refresh token does not match: ${userId}`);
      throw new ForbiddenException('Access Denied');
    }

    const tokens = await this.getTokens(user.id.toString(), user.email);

    await this.updateRefreshToken(user.id.toString(), tokens.refreshToken);

    this.logger.log(`Tokens refreshed successfully for user: ${userId}`);
    // Audit token refresh
    await this.auditService.logSecurityEvent(
      AuditAction.TOKEN_REFRESH,
      {
        userId,
        email: user.email,
        ip,
        userAgent,
        requestId,
      },
      true,
    );
    return { tokens };
  }

  async updateRefreshToken(userId: string, refreshToken: string) {
    this.logger.log(`Updating refresh token for user: ${userId}`);
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.userService.update(userId, {
      refreshToken: hashedRefreshToken,
    });
    this.logger.log(`Refresh token updated successfully for user: ${userId}`);
  }

  async getTokens(
    userId: string,
    email: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    this.logger.debug(`Creating tokens for user: ${userId}`);
    const payload = { id: userId, email };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: configuration().jwt.secret,
      expiresIn: configuration().jwt.expiresIn,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: configuration().jwt.refreshSecret,
      expiresIn: configuration().jwt.refreshExpiresIn,
    });

    this.logger.debug(`Created access token: ${accessToken}`);
    this.logger.debug(`Created refresh token: ${refreshToken}`);

    return {
      accessToken,
      refreshToken,
    };
  }
}
