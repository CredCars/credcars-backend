import {
  Controller,
  Post,
  Body,
  Res,
  UseGuards,
  Get,
  Req,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { ResponseService } from '@util/response.service';
import { CreateUserDTO } from '@user/dto';
import { LoginUserDTO } from '@auth/dto';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { User } from '@user/schema/user.schema';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthThrottlerGuard } from '@common/guards/throttler-behind-proxy.guard';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RefreshTokenGuard } from '@auth/guards/refresh-token.guard';
import { Logger } from '@nestjs/common';

@ApiTags('Auth')
@Controller('auth')
// Use custom throttler guard for better IP tracking behind proxies
@UseGuards(AuthThrottlerGuard)
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly responseService: ResponseService,
  ) {}

  @Post('register')
  @Throttle({ strict: { limit: 5, ttl: 60000 } }) // 5 requests per minute for registration
  @ApiOperation({ summary: 'Register user' })
  @ApiBody({ type: CreateUserDTO })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    type: User,
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 409, description: 'User already exists.' })
  @ApiResponse({
    status: 429,
    description: 'ThrottlerException: Too Many Requests',
  })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async register(
    @Body() body: CreateUserDTO,
    @Res() res: Response,
    @Req() req: any,
  ) {
    try {
      const requestId = req.id;
      const ip = req.ip || req.ips?.[0] || req.connection?.remoteAddress;
      const userAgent = req.headers['user-agent'];
      const user = await this.authService.register(
        body,
        ip,
        userAgent,
        requestId,
      );
      return this.responseService.json(
        res,
        201,
        'User registered successfully',
        user,
      );
    } catch (error) {
      throw error;
    }
  }

  @Post('login')
  @Throttle({ strict: { limit: 5, ttl: 60000 } }) // 5 requests per minute for login (prevent brute force)
  @ApiOperation({ summary: 'Login user' })
  @ApiBody({ type: LoginUserDTO })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: String,
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  @ApiResponse({
    status: 429,
    description: 'ThrottlerException: Too Many Requests',
  })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async login(
    @Body() body: LoginUserDTO,
    @Res() res: Response,
    @Req() req: any,
  ) {
    try {
      const requestId = req.id;
      const ip = req.ip || req.ips?.[0] || req.connection?.remoteAddress;
      const userAgent = req.headers['user-agent'];
      const token = await this.authService.login(
        body,
        ip,
        userAgent,
        requestId,
      );

      return this.responseService.json(res, 200, 'Login successful', token);
    } catch (error) {
      throw error;
    }
  }

  @Get('logout')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async logout(@Req() req: any, @Res() res: Response) {
    try {
      const requestId = req.id;
      const ip = req.ip || req.ips?.[0] || req.connection?.remoteAddress;
      const userAgent = req.headers['user-agent'];
      await this.authService.logout(req.user.id, ip, userAgent, requestId);
      return this.responseService.json(res, 200, 'Logout successful');
    } catch (error) {
      throw error;
    }
  }

  @Get('refresh-tokens')
  @UseGuards(RefreshTokenGuard)
  @ApiOperation({ summary: 'Refresh tokens' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async refreshTokens(@Req() req: any, @Res() res: Response) {
    try {
      const requestId = req.id;
      const ip = req.ip || req.ips?.[0] || req.connection?.remoteAddress;
      const userAgent = req.headers['user-agent'];
      const tokens = await this.authService.refreshTokens(
        req.user.id,
        req.user.refreshToken,
        ip,
        userAgent,
        requestId,
      );

      return this.responseService.json(
        res,
        200,
        'Tokens refreshed successfully',
        tokens,
      );
    } catch (error) {
      throw error;
    }
  }
}
