import { jest } from '@jest/globals';
import { getModelToken } from '@nestjs/mongoose';
import { createMockModel } from './mocks/model.mock';

// Mock NestJS Mongoose globally
jest.mock('@nestjs/mongoose', () => ({
  Prop: () => () => {},
  Schema: () => (target: any) => target,
  SchemaFactory: {
    createForClass: () => ({ pre: jest.fn(), post: jest.fn() }),
  },
  MongooseModule: {
    forRoot: jest.fn(() => ({ module: jest.fn() })),
    forRootAsync: jest.fn(() => ({ module: jest.fn() })),
    forFeature: jest.fn(() => ({ module: jest.fn() })),
  },
  getModelToken: (name: string) => name, // token string
}));

// Provide a single, reusable helper for overriding all models
export const overrideAllModels = (moduleBuilder: any, models: string[]) => {
  models.forEach((name) => {
    moduleBuilder
      .overrideProvider(getModelToken(name))
      .useValue(createMockModel());
  });
};
