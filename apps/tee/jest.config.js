module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  testPathIgnorePatterns: [
    '<rootDir>/../contracts',
    '/node_modules/',
    '/dist/'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage',
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(p-map|openai|@cerebras|zod))'
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        isolatedModules: true,
        skipLibCheck: true
      },
      diagnostics: {
        ignoreCodes: ['TS151001', 'TS2578'],
        pretty: true,
        warnOnly: true
      }
    }]
  },
  // Mock the problematic modules
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  // Improve module resolution
  resolver: undefined,
  // Ensure proper type checking
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  }
};
