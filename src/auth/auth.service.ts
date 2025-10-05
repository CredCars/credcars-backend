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

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private readonly logger: Logger,
  ) {}

  async register(body: CreateUserDTO): Promise<UserDocument> {
    console.log('trying to register user with email:', body.email);
    return this.userService.create(body.email, body.password);
  }

  async login(
    body: LoginUserDTO,
  ): Promise<
    { tokens: { accessToken: string; refreshToken: string } } | Error
  > {
    this.logger.log(`Logging in user with email: ${body.email}`);

    const user = await this.userService.findByEmail(body.email);

    if (!user || !(await bcrypt.compare(body.password, user.password))) {
      this.logger.error(`Invalid credentials for user: ${body.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.log(`User logged in successfully: ${user.email}`);
    const tokens = await this.getTokens(user.id.toString(), user.email);
    this.logger.debug(`Created refresh token: ${tokens.refreshToken}`);

    await this.updateRefreshToken(user.id.toString(), tokens.refreshToken);

    return {
      tokens,
    };
  }

  async logout(userId: string) {
    this.logger.log(`Logging out user: ${userId}`);
    await this.userService.update(userId, { refreshToken: null });
    this.logger.log(`User logged out successfully: ${userId}`);
  }

  async refreshTokens(userId: string, refreshToken: string) {
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
