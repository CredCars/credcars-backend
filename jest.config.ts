import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: 'src/.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: 'coverage',
  setupFiles: ['<rootDir>/test/jest-setup.ts'], // run setup before any test imports
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@util/(.*)$': '<rootDir>/src/util/$1',
    '^@user/(.*)$': '<rootDir>/src/user/$1',
    '^@auth/(.*)$': '<rootDir>/src/auth/$1',
    '^@constants/(.*)$': '<rootDir>/src/constants/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@app/(.*)$': '<rootDir>/src/app/$1',
  },
};
export default config;
