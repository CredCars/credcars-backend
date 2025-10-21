import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ResponseService } from '../util/response.service';
import { CreateUserDTO } from '../user/dto';
import { LoginUserDTO } from './dto';
import {
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { User } from '../user/schema/user.schema';
import { AuthThrottlerGuard } from '../common/guards/throttler-behind-proxy.guard';
import { ThrottlerModule } from '@nestjs/throttler';

describe('AuthController', () => {
  let authController: AuthController;
  let authService: AuthService;
  let responseService: ResponseService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    refreshTokens: jest.fn(),
  };

  const mockResponseService = {
    json: jest.fn(),
  };

  const mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as any;

  const mockAuthThrottlerGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            ttl: 60000,
            limit: 10,
          },
        ]),
      ],
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ResponseService, useValue: mockResponseService },
        { provide: AuthThrottlerGuard, useValue: mockAuthThrottlerGuard },
      ],
    }).compile();

    authController = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    responseService = module.get<ResponseService>(ResponseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const createUserDto: CreateUserDTO = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should register a new user successfully', async () => {
      const mockUser: User = { id: '1', email: 'test@example.com' } as User;
      mockAuthService.register.mockResolvedValue(mockUser);

      await authController.register(createUserDto, mockResponse);

      expect(authService.register).toHaveBeenCalledWith(createUserDto);
      expect(responseService.json).toHaveBeenCalledWith(
        mockResponse,
        201,
        'User registered successfully',
        mockUser,
      );
    });

    it('should handle ConflictException during registration', async () => {
      const error = new ConflictException('Email already exists');
      mockAuthService.register.mockRejectedValue(error);

      await expect(
        authController.register(createUserDto, mockResponse),
      ).rejects.toThrow(ConflictException);

      expect(authService.register).toHaveBeenCalledWith(createUserDto);
    });

    it('should handle BadRequestException during registration', async () => {
      const error = new BadRequestException('Invalid input');
      mockAuthService.register.mockRejectedValue(error);

      await expect(
        authController.register(createUserDto, mockResponse),
      ).rejects.toThrow(BadRequestException);

      expect(authService.register).toHaveBeenCalledWith(createUserDto);
    });

    it('should handle InternalServerErrorException during registration', async () => {
      const error = new InternalServerErrorException('Database error');
      mockAuthService.register.mockRejectedValue(error);

      await expect(
        authController.register(createUserDto, mockResponse),
      ).rejects.toThrow(InternalServerErrorException);

      expect(authService.register).toHaveBeenCalledWith(createUserDto);
    });

    it('should handle unexpected errors during registration', async () => {
      const error = new Error('Unexpected error');
      mockAuthService.register.mockRejectedValue(error);

      await expect(
        authController.register(createUserDto, mockResponse),
      ).rejects.toThrow(Error);

      expect(authService.register).toHaveBeenCalledWith(createUserDto);
    });
  });

  describe('login', () => {
    const loginUserDto: LoginUserDTO = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login a user successfully', async () => {
      const mockToken = {
        access_token: 'mock_token',
        refresh_token: 'mock_refresh_token',
      };
      mockAuthService.login.mockResolvedValue(mockToken);

      await authController.login(loginUserDto, mockResponse);

      expect(authService.login).toHaveBeenCalledWith(loginUserDto);
      expect(responseService.json).toHaveBeenCalledWith(
        mockResponse,
        200,
        'Login successfulll',
        mockToken,
      );
    });

    it('should handle UnauthorizedException during login', async () => {
      const error = new UnauthorizedException('Invalid credentials');
      mockAuthService.login.mockRejectedValue(error);

      await expect(
        authController.login(loginUserDto, mockResponse),
      ).rejects.toThrow(UnauthorizedException);

      expect(authService.login).toHaveBeenCalledWith(loginUserDto);
    });

    it('should handle NotFoundException during login', async () => {
      const error = new NotFoundException('User not found');
      mockAuthService.login.mockRejectedValue(error);

      await expect(
        authController.login(loginUserDto, mockResponse),
      ).rejects.toThrow(NotFoundException);

      expect(authService.login).toHaveBeenCalledWith(loginUserDto);
    });

    it('should handle BadRequestException during login', async () => {
      const error = new BadRequestException('Invalid input');
      mockAuthService.login.mockRejectedValue(error);

      await expect(
        authController.login(loginUserDto, mockResponse),
      ).rejects.toThrow(BadRequestException);

      expect(authService.login).toHaveBeenCalledWith(loginUserDto);
    });

    it('should handle InternalServerErrorException during login', async () => {
      const error = new InternalServerErrorException('Database error');
      mockAuthService.login.mockRejectedValue(error);

      await expect(
        authController.login(loginUserDto, mockResponse),
      ).rejects.toThrow(InternalServerErrorException);

      expect(authService.login).toHaveBeenCalledWith(loginUserDto);
    });

    it('should handle unexpected errors during login', async () => {
      const error = new Error('Unexpected error');
      mockAuthService.login.mockRejectedValue(error);

      await expect(
        authController.login(loginUserDto, mockResponse),
      ).rejects.toThrow(Error);

      expect(authService.login).toHaveBeenCalledWith(loginUserDto);
    });
  });

  describe('logout', () => {
    const mockRequest = {
      user: { id: 'user_id' },
    };

    it('should logout a user successfully', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);

      await authController.logout(mockRequest, mockResponse);

      expect(authService.logout).toHaveBeenCalledWith(mockRequest.user.id);
      expect(responseService.json).toHaveBeenCalledWith(
        mockResponse,
        200,
        'Logout successful',
      );
    });

    it('should handle UnauthorizedException during logout', async () => {
      const error = new UnauthorizedException('Invalid token');
      mockAuthService.logout.mockRejectedValue(error);

      await expect(
        authController.logout(mockRequest, mockResponse),
      ).rejects.toThrow(UnauthorizedException);

      expect(authService.logout).toHaveBeenCalledWith(mockRequest.user.id);
    });

    it('should handle InternalServerErrorException during logout', async () => {
      const error = new InternalServerErrorException('Database error');
      mockAuthService.logout.mockRejectedValue(error);

      await expect(
        authController.logout(mockRequest, mockResponse),
      ).rejects.toThrow(InternalServerErrorException);

      expect(authService.logout).toHaveBeenCalledWith(mockRequest.user.id);
    });

    it('should handle unexpected errors during logout', async () => {
      const error = new Error('Unexpected error');
      mockAuthService.logout.mockRejectedValue(error);

      await expect(
        authController.logout(mockRequest, mockResponse),
      ).rejects.toThrow(Error);

      expect(authService.logout).toHaveBeenCalledWith(mockRequest.user.id);
    });
  });

  describe('refreshTokens', () => {
    const mockRequest = {
      user: { id: 'user_id', refreshToken: 'refresh_token' },
    };

    it('should refresh tokens successfully', async () => {
      const mockTokens = {
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
      };
      mockAuthService.refreshTokens.mockResolvedValue(mockTokens);

      await authController.refreshTokens(mockRequest, mockResponse);

      expect(authService.refreshTokens).toHaveBeenCalledWith(
        mockRequest.user.id,
        mockRequest.user.refreshToken,
      );
      expect(responseService.json).toHaveBeenCalledWith(
        mockResponse,
        200,
        'Tokens refreshed successfully',
        mockTokens,
      );
    });

    it('should handle UnauthorizedException during token refresh', async () => {
      const error = new UnauthorizedException('Invalid refresh token');
      mockAuthService.refreshTokens.mockRejectedValue(error);

      await expect(
        authController.refreshTokens(mockRequest, mockResponse),
      ).rejects.toThrow(UnauthorizedException);

      expect(authService.refreshTokens).toHaveBeenCalledWith(
        mockRequest.user.id,
        mockRequest.user.refreshToken,
      );
    });

    it('should handle InternalServerErrorException during token refresh', async () => {
      const error = new InternalServerErrorException('Database error');
      mockAuthService.refreshTokens.mockRejectedValue(error);

      await expect(
        authController.refreshTokens(mockRequest, mockResponse),
      ).rejects.toThrow(InternalServerErrorException);

      expect(authService.refreshTokens).toHaveBeenCalledWith(
        mockRequest.user.id,
        mockRequest.user.refreshToken,
      );
    });

    it('should handle unexpected errors during token refresh', async () => {
      const error = new Error('Unexpected error');
      mockAuthService.refreshTokens.mockRejectedValue(error);

      await expect(
        authController.refreshTokens(mockRequest, mockResponse),
      ).rejects.toThrow(Error);

      expect(authService.refreshTokens).toHaveBeenCalledWith(
        mockRequest.user.id,
        mockRequest.user.refreshToken,
      );
    });
  });
});
