import { Test, TestingModule } from '@nestjs/testing';
import { UtilService } from './util.service';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RangeEnums, CurrencyAmount } from '.';
import axios from 'axios';
import * as moment from 'moment';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';
dotenv.config();

type MockModel<T = any> = Partial<Record<keyof Model<T>, jest.Mock>> & {
  select: jest.Mock;
};

jest.mock('axios');

describe('UtilService', () => {
  let service: UtilService;
  let mockModel: MockModel;
  let mockLogger: {
    error: jest.Mock;
    log: jest.Mock;
    warn: jest.Mock;
    debug: jest.Mock;
  };
  let mockConfigService: { get: jest.Mock };

  beforeEach(async () => {
    mockModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      distinct: jest.fn(),
      countDocuments: jest.fn(),
      find: jest.fn().mockReturnThis(),
      aggregate: jest.fn(),
      select: jest.fn().mockReturnThis(),
    };

    mockLogger = {
      error: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };
    mockConfigService = { get: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UtilService,
        {
          provide: getModelToken('YourModelName'),
          useValue: mockModel,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<UtilService>(UtilService);
  });

  describe('isDev', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it.each([
      ['development', true],
      ['test', true],
      ['localhost', true],
      ['local', true],
      ['', true],
      [undefined, true],
      ['production', false],
    ])('should return correct value for NODE_ENV=%s', (env, expected) => {
      if (env === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = env as string;
      }
      const result = service.isDev();
      expect(result).toBe(expected);
    });
  });

  describe('formatCurrency', () => {
    it('should format currency correctly', () => {
      expect(service.formatCurrency('1000', 2)).toBe('1,000.00');
      expect(service.formatCurrency('1000000', 2)).toBe('1,000,000.00');
      expect(service.formatCurrency('1000.5', 2)).toBe('1,000.50');
      expect(service.formatCurrency('1000', 0)).toBe('1,000');
    });
  });

  describe('generateRandom', () => {
    it('should generate random string of specified length', () => {
      const result = service.generateRandom(10);
      expect(result.length).toBe(10);
    });

    it('should generate OTP with only numbers', () => {
      const result = service.generateRandom(6, undefined, true);
      expect(result).toMatch(/^\d+$/);
    });

    it('should use custom characters if provided', () => {
      const result = service.generateRandom(5, 'AB');
      expect(result).toMatch(/^[AB]+$/);
    });
  });

  describe('getDefaultCountry', () => {
    it('should return default country object', () => {
      const result = service.getDefaultCountry();
      expect(result).toEqual({
        name: 'Nigeria',
        slug: 'nigeria',
        code: '+234',
      });
    });
  });

  describe('getDefaultCurrency', () => {
    it('should return default currency', () => {
      expect(service.getDefaultCurrency()).toBe('NGN');
    });
  });

  describe('extractBase64FromImgUrl', () => {
    it('should extract base64 from image URL', async () => {
      const mockResponse = {
        headers: { 'content-type': 'image/jpeg' },
        data: Buffer.from('test image data'),
      };
      (axios.get as jest.MockedFunction<typeof axios.get>).mockResolvedValue(
        mockResponse,
      );

      const result = await service.extractBase64FromImgUrl(
        'http://example.com/image.jpg',
      );
      expect(result).toContain('data:image/jpeg;base64,');
    });

    it('should return null on error', async () => {
      (axios.get as jest.MockedFunction<typeof axios.get>).mockRejectedValue(
        new Error('Network error'),
      );

      const result = await service.extractBase64FromImgUrl(
        'http://example.com/image.jpg',
      );
      expect(result).toBeNull();
    });
  });

  describe('isAxiosError', () => {
    it('should identify Axios errors', () => {
      const axiosError = { response: { data: {} } };
      const nonAxiosError = new Error('Regular error');

      expect(service.isAxiosError(axiosError)).toBe(true);
      expect(service.isAxiosError(nonAxiosError)).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('should get message from Axios error', () => {
      const axiosError = { response: { data: { message: 'Axios error' } } };
      expect(service.getErrorMessage(axiosError)).toBe('Axios error');
    });

    it('should get message from regular error', () => {
      const error = new Error('Regular error');
      expect(service.getErrorMessage(error)).toBe('Regular error');
    });
  });

  describe('combineAmount', () => {
    it('should combine amounts correctly', () => {
      const amounts: CurrencyAmount[] = [
        { value: 100, currency: 'USD' },
        { value: 200, currency: 'USD' },
      ];
      const result = service.combineAmount(amounts);
      expect(result).toEqual({ value: 300, currency: 'NGN' });
    });
  });

  describe('convertAmountToACurrency', () => {
    it('should convert amount to specified currency', () => {
      const amount: CurrencyAmount = { value: 100, currency: 'USD' };
      const result = service.convertAmountToACurrency(amount, 'NGN');
      expect(result).toEqual({ value: 100, currency: 'NGN' });
    });
  });

  describe('getRangeToTimeline', () => {
    it('should return correct date range for Day', () => {
      const result = service.getRangeToTimeline(RangeEnums.Day);
      expect(result.startDate).toEqual(moment().startOf('day').toDate());
      expect(result.endDate).toEqual(moment().endOf('day').toDate());
    });

    // Add similar tests for other RangeEnums...

    it('should handle Custom range', () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');
      const result = service.getRangeToTimeline(
        RangeEnums.Custom,
        startDate,
        endDate,
      );
      expect(result.startDate).toEqual(startDate);
      expect(result.endDate).toEqual(endDate);
    });

    it('should throw error for invalid range', () => {
      expect(() =>
        service.getRangeToTimeline('InvalidRange' as RangeEnums),
      ).toThrow('invalid range selected');
    });
  });

  describe('findOneOrCreate', () => {
    it('should find existing document', async () => {
      const mockDoc = { _id: '1', name: 'Test' };
      mockModel.findOne!.mockResolvedValue(mockDoc);

      const result = await service.findOneOrCreate(
        mockModel as unknown as Model<any>,
        { name: 'Test' },
        {},
      );
      expect(result).toEqual(mockDoc);
    });

    it('should create new document if not found', async () => {
      const mockDoc = { _id: '1', name: 'Test' };
      mockModel.findOne!.mockResolvedValue(null);
      mockModel.create!.mockResolvedValue([mockDoc]);

      const result = await service.findOneOrCreate(
        mockModel as unknown as Model<any>,
        { name: 'Test' },
        { name: 'Test' },
      );
      expect(result).toEqual(mockDoc);
    });
  });

  describe('ucfirst', () => {
    it('should capitalize first letter of each word', () => {
      expect(UtilService.ucfirst('hello world')).toBe('Hello World');
      expect(UtilService.ucfirst('HELLO WORLD')).toBe('Hello World');
    });

    it('should handle empty string', () => {
      expect(UtilService.ucfirst('')).toBe('');
    });
  });

  describe('unslug', () => {
    it('should convert slug to title case', () => {
      expect(UtilService.unslug('hello-world')).toBe('Hello World');
      expect(UtilService.unslug('test-slug-here')).toBe('Test Slug Here');
    });
  });

  describe('trimAndLowerCase', () => {
    it('should trim and convert to lowercase', () => {
      expect(service.trimAndLowerCase(' Hello World ')).toBe('hello world');
      expect(service.trimAndLowerCase('TEST')).toBe('test');
    });

    it('should handle empty string', () => {
      expect(service.trimAndLowerCase('')).toBe('');
    });
  });

  describe('calculateBusinessDays', () => {
    it('should calculate business days correctly', () => {
      const from = new Date('2023-05-01'); // Monday
      const to = new Date('2023-05-05'); // Friday
      expect(service.calculateBusinessDays(from, to)).toEqual({
        businessDays: 5,
        weekends: 0,
      });
    });

    it('should handle start on Sunday', () => {
      const from = new Date('2023-04-30'); // Sunday
      const to = new Date('2023-05-05'); // Friday
      expect(service.calculateBusinessDays(from, to)).toEqual({
        businessDays: 5,
        weekends: 1,
      });
    });

    it('should handle end on Saturday', () => {
      const from = new Date('2023-05-01'); // Monday
      const to = new Date('2023-05-06'); // Saturday
      expect(service.calculateBusinessDays(from, to)).toEqual({
        businessDays: 5,
        weekends: 1,
      });
    });

    // Add more tests...
  });

  describe('generateRandomString', () => {
    it('should generate random string of specified length', () => {
      const result = UtilService.generateRandomString(10);
      expect(result.length).toBe(10);
    });

    it('should generate OTP with only numbers', () => {
      const result = UtilService.generateRandomString(6, undefined, true);
      expect(result).toMatch(/^\d+$/);
    });

    it('should use custom characters if provided', () => {
      const result = UtilService.generateRandomString(5, 'AB');
      expect(result).toMatch(/^[AB]+$/);
    });
  });

  describe('roundTo2Figs', () => {
    it('should round to 2 decimal places', () => {
      expect(service.roundTo2Figs(1.234)).toBe(1.23);
      expect(service.roundTo2Figs(1.235)).toBe(1.24);
      expect(service.roundTo2Figs(1)).toBe(1);
    });
  });

  describe('generateUniqueEmail', () => {
    it('should generate a unique email', () => {
      const email = service.generateUniqueEmail();
      expect(email).toMatch(/^.+\+random@gmail\.com$/);
    });
  });

  describe('generateUniquePhoneNumber', () => {
    it('should generate a unique phone number', () => {
      const phoneNumber = service.generateUniquePhoneNumber('+1');
      expect(phoneNumber).toMatch(/^\+1\d{10}$/);
    });
  });

  describe('countDistint', () => {
    it('should count distinct values', async () => {
      mockModel.distinct!.mockResolvedValue(['value1', 'value2']);
      const result = await service.countDistint(
        mockModel as unknown as Model<any>,
        {},
        'field',
      );
      expect(result).toEqual(['value1', 'value2']);
    });
  });

  describe('countMultipleCollectionDistinct', () => {
    it('should count distinct values across multiple collections', async () => {
      const mockModels = [
        { distinct: jest.fn().mockResolvedValue(['value1', 'value2']) },
        { distinct: jest.fn().mockResolvedValue(['value2', 'value3']) },
      ] as any;
      const result = await service.countMultipleCollectionDistinct(
        mockModels,
        {},
        'field',
      );
      expect(result).toEqual(new Set(['value1', 'value2', 'value3']));
    });

    it('should return empty set on error', async () => {
      const mockModels = [
        { distinct: jest.fn().mockRejectedValue(new Error('DB error')) },
      ] as any;
      const result = await service.countMultipleCollectionDistinct(
        mockModels,
        {},
        'field',
      );
      expect(result).toEqual(new Set());
    });
  });

  describe('recordCount', () => {
    it('should count records', async () => {
      mockModel.countDocuments!.mockResolvedValue(5);
      const result = await service.recordCount(
        mockModel as unknown as Model<any>,
        {},
      );
      expect(result).toBe(5);
    });
  });

  describe('fetchData', () => {
    it('should fetch data and select organization', async () => {
      mockModel.find!.mockReturnThis();
      mockModel.select!.mockResolvedValue([{ organization: 'Org1' }]);
      const result = await service.fetchData(
        mockModel as unknown as Model<any>,
        {},
      );
      expect(result).toEqual([{ organization: 'Org1' }]);
      expect(mockModel.select).toHaveBeenCalledWith('organization');
    });
  });

  describe('countDistinctAcrossCollections', () => {
    it('should count distinct values across collections', async () => {
      const mockAggregate = jest.fn().mockResolvedValue([{ count: 5 }]);
      const mockModel = { aggregate: mockAggregate };

      const result = await service.countDistinctAcrossCollections(
        mockModel as any,
        'field',
      );
      expect(result).toBe(5);
      expect(mockAggregate).toHaveBeenCalledWith([
        { $group: { _id: '$field' } },
        { $group: { _id: null, count: { $sum: 1 } } },
      ]);
    });

    it('should handle database errors', async () => {
      const mockError = new Error('DB error');
      const mockAggregate = jest.fn().mockRejectedValue(mockError);
      const mockModel = { aggregate: mockAggregate };

      await expect(
        service.countDistinctAcrossCollections(mockModel as any, 'field'),
      ).rejects.toThrow('DB error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error counting distinct across collections: DB error',
        expect.any(String),
      );
    });
  });
});
