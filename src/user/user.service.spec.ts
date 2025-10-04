import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { getModelToken } from '@nestjs/mongoose';
import { UserDocument } from './schema/user.schema';
import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Model } from 'mongoose';
import { SchemaNames } from '../constants/schema-constants';
import { Logger } from '@nestjs/common';

describe('UserService', () => {
  let service: UserService;
  let userModel: Model<UserDocument>;

  const mockUserModel = {
    create: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };

  const mockLogger = { error: jest.fn(), log: jest.fn(), warn: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getModelToken(SchemaNames.USER),
          useValue: mockUserModel,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userModel = module.get<Model<UserDocument>>(
      getModelToken(SchemaNames.USER),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should successfully create a new user', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const mockUser = { email, password } as UserDocument;

      (userModel.create as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.create(email, password);

      expect(userModel.create).toHaveBeenCalledWith({ email, password });
      expect(result).toEqual(mockUser);
    });

    it('should throw ConflictException when email already exists', async () => {
      const mockError: any = new Error('Duplicate key error');
      mockError.code = 11000;
      (userModel.create as jest.Mock).mockRejectedValue(mockError);

      await expect(
        service.create('test@example.com', 'password'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw InternalServerErrorException for other errors', async () => {
      (userModel.create as jest.Mock).mockRejectedValue(
        new Error('Some other error'),
      );

      await expect(
        service.create('test@example.com', 'password'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('findByEmail', () => {
    it('should find a user by email', async () => {
      const email = 'test@example.com';
      const mockUser = { email } as UserDocument;

      const mockExec = jest.fn().mockResolvedValue(mockUser);
      (userModel.findOne as jest.Mock).mockReturnValue({ exec: mockExec });

      const result = await service.findByEmail(email);

      expect(userModel.findOne).toHaveBeenCalledWith({ email });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user is not found', async () => {
      (userModel.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.findByEmail('nonexistent@example.com'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate any errors from the database query', async () => {
      const email = 'test@example.com';

      const mockExec = jest.fn().mockRejectedValue(new Error('Database error'));
      (userModel.findOne as jest.Mock).mockReturnValue({ exec: mockExec });

      await expect(service.findByEmail(email)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('findById', () => {
    it('should find a user by ID', async () => {
      const userId = 'validUserId';
      const mockUser = {
        _id: userId,
        email: 'test@example.com',
      } as UserDocument;

      const mockExec = jest.fn().mockResolvedValue(mockUser);
      (userModel.findById as jest.Mock).mockReturnValue({ exec: mockExec });

      const result = await service.findById(userId);

      expect(userModel.findById).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user is not found', async () => {
      (userModel.findById as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findById('nonexistentId')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should propagate any errors from the database query', async () => {
      const userId = 'validUserId';

      const mockExec = jest.fn().mockRejectedValue(new Error('Database error'));
      (userModel.findById as jest.Mock).mockReturnValue({ exec: mockExec });

      await expect(service.findById(userId)).rejects.toThrow('Database error');
    });
  });

  describe('update', () => {
    it('should successfully update a user', async () => {
      const userId = 'validUserId';
      const updateData = { email: 'updated@example.com' };
      const mockUpdatedUser = { _id: userId, ...updateData } as UserDocument;

      const mockExec = jest.fn().mockResolvedValue(mockUpdatedUser);
      (userModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
        exec: mockExec,
      });

      const result = await service.update(userId, updateData);

      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        userId,
        updateData,
        { new: true, runValidators: true },
      );
      expect(result).toEqual(mockUpdatedUser);
    });

    it('should throw NotFoundException if user is not found during update', async () => {
      (userModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.update('nonexistentId', { email: 'new@example.com' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate any errors from the database query', async () => {
      const userId = 'validUserId';
      const updateData = { email: 'updated@example.com' };

      const mockExec = jest.fn().mockRejectedValue(new Error('Database error'));
      (userModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
        exec: mockExec,
      });

      await expect(service.update(userId, updateData)).rejects.toThrow(
        'Database error',
      );
    });

    it('should handle validation errors during update', async () => {
      const userId = 'validUserId';
      const updateData = { email: 'invalid-email' };

      const validationError = new Error('Validation failed') as any;
      validationError.name = 'ValidationError';

      const mockExec = jest.fn().mockRejectedValue(validationError);
      (userModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
        exec: mockExec,
      });

      await expect(service.update(userId, updateData)).rejects.toThrow(
        validationError,
      );
    });
  });
});
