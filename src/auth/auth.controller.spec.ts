import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ResponseService } from '@util/response.service';
import { CreateUserDTO } from '../user/dto';
import { LoginUserDTO } from '@auth/dto';
import { User } from '@user/schema/user.schema';
import { AuthThrottlerGuard } from '@common/guards/throttler-behind-proxy.guard';
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

  const mockRequest = {
    id: 'req-123',
    ip: '127.0.0.1',
    headers: { 'user-agent': 'jest-test-agent' },
    user: { id: 'user-id', refreshToken: 'refresh_token' },
  } as any;

  const mockAuthThrottlerGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }])],
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

  // ----------------------------
  // REGISTER
  // ----------------------------
  describe('register', () => {
    const createUserDto: CreateUserDTO = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should register a new user successfully', async () => {
      const mockUser: User = { id: '1', email: 'test@example.com' } as User;
      mockAuthService.register.mockResolvedValue(mockUser);

      await authController.register(createUserDto, mockResponse, mockRequest);

      expect(authService.register).toHaveBeenCalledWith(
        createUserDto,
        mockRequest.ip,
        mockRequest.headers['user-agent'],
        mockRequest.id,
      );
      expect(responseService.json).toHaveBeenCalledWith(
        mockResponse,
        201,
        'User registered successfully',
        mockUser,
      );
    });
  });

  // ----------------------------
  // LOGIN
  // ----------------------------
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

      await authController.login(loginUserDto, mockResponse, mockRequest);

      expect(authService.login).toHaveBeenCalledWith(
        loginUserDto,
        mockRequest.ip,
        mockRequest.headers['user-agent'],
        mockRequest.id,
      );
      expect(responseService.json).toHaveBeenCalledWith(
        mockResponse,
        200,
        'Login successful',
        mockToken,
      );
    });
  });

  // ----------------------------
  // LOGOUT
  // ----------------------------
  describe('logout', () => {
    it('should logout a user successfully', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);

      await authController.logout(mockRequest, mockResponse);

      expect(authService.logout).toHaveBeenCalledWith(
        mockRequest.user.id,
        mockRequest.ip,
        mockRequest.headers['user-agent'],
        mockRequest.id,
      );
      expect(responseService.json).toHaveBeenCalledWith(
        mockResponse,
        200,
        'Logout successful',
      );
    });
  });

  // ----------------------------
  // REFRESH TOKENS
  // ----------------------------
  describe('refreshTokens', () => {
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
        mockRequest.ip,
        mockRequest.headers['user-agent'],
        mockRequest.id,
      );
      expect(responseService.json).toHaveBeenCalledWith(
        mockResponse,
        200,
        'Tokens refreshed successfully',
        mockTokens,
      );
    });
  });
});
