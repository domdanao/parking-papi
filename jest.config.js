/** @type {import('jest').Config} */
export default {
  preset: '@babel/preset-env',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/resources/js/test-setup.ts'],
  testMatch: [
    '<rootDir>/resources/js/**/__tests__/**/*.(ts|tsx|js|jsx)',
    '<rootDir>/resources/js/**/*.(test|spec).(ts|tsx|js|jsx)'
  ],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/resources/js/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        jsx: 'react-jsx',
      },
    }],
    '^.+\\.(js|jsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { modules: false }],
        ['@babel/preset-react', { runtime: 'automatic' }],
      ],
    }],
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  collectCoverageFrom: [
    'resources/js/**/*.{ts,tsx}',
    '!resources/js/**/*.d.ts',
    '!resources/js/test-setup.ts',
    '!resources/js/app.tsx',
    '!resources/js/bootstrap.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};