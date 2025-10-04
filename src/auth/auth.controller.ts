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
import { ResponseService } from '../util/response.service';
import { CreateUserDTO } from '../user/dto';
import { LoginUserDTO } from './dto';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { User } from '../user/schema/user.schema';
import { ApiTags } from '@nestjs/swagger';
import { AuthThrottlerGuard } from '../common/guards/throttler-behind-proxy.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { Logger } from '@nestjs/common';

@ApiTags('Auth')
@Controller('auth')
@UseGuards(AuthThrottlerGuard)
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly responseService: ResponseService,
  ) {}

  @Post('register')
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
  async register(@Body() body: CreateUserDTO, @Res() res: Response) {
    try {
      const user = await this.authService.register(body);
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
  async login(@Body() body: LoginUserDTO, @Res() res: Response) {
    try {
      const token = await this.authService.login(body);

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
  async logout(@Req() req, @Res() res: Response) {
    try {
      await this.authService.logout(req.user.id);
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
  async refreshTokens(@Req() req, @Res() res: Response) {
    try {
      const tokens = await this.authService.refreshTokens(
        req.user.id,
        req.user.refreshToken,
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
