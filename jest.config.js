/** @type {import('jest').Config} */
export default {
   preset: 'ts-jest/presets/default-esm',
   testEnvironment: 'node',
   extensionsToTreatAsEsm: ['.ts'],
   transform: {
      '^.+\\.ts$': ['ts-jest', { useESM: true }],
   },
   globals: {
      'ts-jest': {
         useESM: true,
      },
   },
   testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
   passWithNoTests: true,
   moduleFileExtensions: ['ts', 'js', 'json'],
   roots: ['<rootDir>/packages/'],
   coverageDirectory: 'coverage',
   collectCoverageFrom: ['packages/*/src/**/*.{ts,js}'],
};
