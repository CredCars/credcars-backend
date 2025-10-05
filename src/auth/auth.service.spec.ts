import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { CreateUserDTO } from '../user/dto';
import { LoginUserDTO } from './dto';
import { UserDocument } from '../user/schema/user.schema';
import configuration from '@config/configuration';

jest.mock('bcryptjs');

describe('AuthService', () => {
  let service: AuthService;
  let userService: jest.Mocked<UserService>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: {
            create: jest.fn(),
            findByEmail: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
          },
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get(UserService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const createUserDto: CreateUserDTO = {
        email: 'test@example.com',
        password: 'password123',
      };
      const mockUser: Partial<UserDocument> = {
        email: createUserDto.email,
        password: 'hashedPassword',
      };

      userService.create.mockResolvedValue(mockUser as UserDocument);

      const result = await service.register(createUserDto);

      expect(userService.create).toHaveBeenCalledWith(
        createUserDto.email,
        createUserDto.password,
      );
      expect(result).toEqual(mockUser);
    });

    it('should throw an error if user creation fails', async () => {
      const createUserDto: CreateUserDTO = {
        email: 'test@example.com',
        password: 'password123',
      };

      userService.create.mockRejectedValue(new Error('User creation failed'));

      await expect(service.register(createUserDto)).rejects.toThrow(
        'User creation failed',
      );
    });
  });

  describe('login', () => {
    const loginUserDto: LoginUserDTO = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should successfully login a user with valid credentials', async () => {
      const mockUser = {
        id: 'userId',
        email: loginUserDto.email,
        password: 'hashedPassword',
      };
      const mockTokens = {
        accessToken: 'mockAccessToken',
        refreshToken: 'mockRefreshToken',
      };

      userService.findByEmail.mockResolvedValue(mockUser as UserDocument);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jest.spyOn(service, 'getTokens').mockResolvedValue(mockTokens);
      jest.spyOn(service, 'updateRefreshToken').mockResolvedValue(undefined);

      const result = await service.login(loginUserDto);

      expect(userService.findByEmail).toHaveBeenCalledWith(loginUserDto.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginUserDto.password,
        mockUser.password,
      );
      expect(service.getTokens).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.email,
      );
      expect(service.updateRefreshToken).toHaveBeenCalledWith(
        mockUser.id,
        mockTokens.refreshToken,
      );
      expect(result).toEqual({ tokens: mockTokens });
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      userService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginUserDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(userService.findByEmail).toHaveBeenCalledWith(loginUserDto.email);
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      const mockUser: Partial<UserDocument> = {
        email: loginUserDto.email,
        password: 'hashedPassword',
      };

      userService.findByEmail.mockResolvedValue(mockUser as UserDocument);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginUserDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(userService.findByEmail).toHaveBeenCalledWith(loginUserDto.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginUserDto.password,
        mockUser.password,
      );
    });
  });

  describe('logout', () => {
    it('should successfully logout a user', async () => {
      const userId = 'testUserId';
      userService.update.mockResolvedValue({} as UserDocument);

      await service.logout(userId);

      expect(userService.update).toHaveBeenCalledWith(userId, {
        refreshToken: null,
      });
    });

    it('should throw an error if logout fails', async () => {
      const userId = 'testUserId';
      userService.update.mockRejectedValue(new Error('Logout failed'));

      await expect(service.logout(userId)).rejects.toThrow('Logout failed');
    });
  });

  describe('refreshTokens', () => {
    const userId = 'testUserId';
    const refreshToken = 'validRefreshToken';

    it('should successfully refresh tokens', async () => {
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        refreshToken: 'hashedRefreshToken',
      };
      const mockTokens = {
        accessToken: 'newAccessToken',
        refreshToken: 'newRefreshToken',
      };

      userService.findById.mockResolvedValue(mockUser as UserDocument);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jest.spyOn(service, 'getTokens').mockResolvedValue(mockTokens);
      jest.spyOn(service, 'updateRefreshToken').mockResolvedValue(undefined);

      const result = await service.refreshTokens(userId, refreshToken);

      expect(userService.findById).toHaveBeenCalledWith(userId);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        refreshToken,
        mockUser.refreshToken,
      );
      expect(service.getTokens).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.email,
      );
      expect(service.updateRefreshToken).toHaveBeenCalledWith(
        mockUser.id,
        mockTokens.refreshToken,
      );
      expect(result).toEqual({ tokens: mockTokens });
    });

    it('should throw ForbiddenException if user not found', async () => {
      userService.findById.mockResolvedValue(null);

      await expect(service.refreshTokens(userId, refreshToken)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException if user has no refresh token', async () => {
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        refreshToken: null,
      };

      userService.findById.mockResolvedValue(mockUser as UserDocument);

      await expect(service.refreshTokens(userId, refreshToken)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw UnauthorizedException if refresh token is missing', async () => {
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        refreshToken: 'hashedRefreshToken',
      };

      userService.findById.mockResolvedValue(mockUser as UserDocument);

      await expect(service.refreshTokens(userId, null)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw ForbiddenException if refresh token does not match', async () => {
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        refreshToken: 'hashedRefreshToken',
      };

      userService.findById.mockResolvedValue(mockUser as UserDocument);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.refreshTokens(userId, refreshToken)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('updateRefreshToken', () => {
    it('should successfully update refresh token', async () => {
      const userId = 'testUserId';
      const refreshToken = 'newRefreshToken';
      const hashedToken = 'hashedRefreshToken';

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedToken);
      userService.update.mockResolvedValue({} as UserDocument);

      await service.updateRefreshToken(userId, refreshToken);

      expect(bcrypt.hash).toHaveBeenCalledWith(refreshToken, 10);
      expect(userService.update).toHaveBeenCalledWith(userId, {
        refreshToken: hashedToken,
      });
    });

    it('should throw an error if update fails', async () => {
      const userId = 'testUserId';
      const refreshToken = 'newRefreshToken';

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedRefreshToken');
      userService.update.mockRejectedValue(new Error('Update failed'));

      await expect(
        service.updateRefreshToken(userId, refreshToken),
      ).rejects.toThrow('Update failed');
    });
  });

  describe('getTokens', () => {
    it('should successfully generate access and refresh tokens', async () => {
      const userId = 'testUserId';
      const email = 'test@example.com';
      const mockAccessToken = 'mockAccessToken';
      const mockRefreshToken = 'mockRefreshToken';

      jwtService.signAsync.mockResolvedValueOnce(mockAccessToken);
      jwtService.signAsync.mockResolvedValueOnce(mockRefreshToken);

      const result = await service.getTokens(userId, email);

      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(jwtService.signAsync).toHaveBeenNthCalledWith(
        1,
        { id: userId, email },
        {
          secret: configuration().jwt.secret,
          expiresIn: configuration().jwt.expiresIn,
        },
      );
      expect(jwtService.signAsync).toHaveBeenNthCalledWith(
        2,
        { id: userId, email },
        {
          secret: configuration().jwt.refreshSecret,
          expiresIn: configuration().jwt.refreshExpiresIn,
        },
      );
      expect(result).toEqual({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
      });
    });

    it('should throw an error if token generation fails', async () => {
      const userId = 'testUserId';
      const email = 'test@example.com';

      jwtService.signAsync.mockRejectedValue(
        new Error('Token generation failed'),
      );

      await expect(service.getTokens(userId, email)).rejects.toThrow(
        'Token generation failed',
      );
    });
  });
});
