import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@config/(.*)$': '<rootDir>/config/$1',
    '^@util/(.*)$': '<rootDir>/util/$1',
    '^@user/(.*)$': '<rootDir>/user/$1',
    '^@auth/(.*)$': '<rootDir>/auth/$1',
    '^@constants/(.*)$': '<rootDir>/constants/$1',
    '^@common/(.*)$': '<rootDir>/common/$1',
    '^@app/(.*)$': '<rootDir>/app/$1',
  },

  setupFiles: ['<rootDir>/../jest.setup.ts'],
};

export default config;
