/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testMatch: ['**/__tests__/**/*.test.ts'],
  setupFiles: ['../__tests__/jest.setup.ts'],
  moduleNameMapper: {
    '^@humory/shared$': '<rootDir>/../../shared/src/index.ts',
    '^uuid$': '<rootDir>/../__mocks__/uuid.js',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: { module: 'commonjs', isolatedModules: true },
    }],
  },
  clearMocks: true,
};
