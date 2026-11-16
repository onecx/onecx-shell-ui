/* eslint-disable */
import type { Config } from 'jest'

// list of patterns for which no transformation/transpiling should be made
const ignoredModulePatterns: string = ['d3-.*', '(.*.mjs$)'].join('|')
// list of patterns excluded by testing/coverage (default: node_modules)
const ignoredPathPatterns: string[] = [
  '<rootDir>/pre_loaders/',
  '<rootDir>/src/main.ts',
  '<rootDir>/src/bootstrap.ts',
  '<rootDir>/src/scope-polyfill',
  '<rootDir>/src/app/shared/generated'
]

const config: Config = {
  displayName: 'onecx-tenant-ui',
  testEnvironment: 'jsdom',
  preset: './jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testMatch: ['<rootDir>/src/app/**/*.spec.ts'],
  testPathIgnorePatterns: ignoredPathPatterns,
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$'
      }
    ]
  },
  transformIgnorePatterns: [`node_modules/(?!${ignoredModulePatterns})`],
  snapshotSerializers: [
    'jest-preset-angular/build/serializers/no-ng-attributes',
    'jest-preset-angular/build/serializers/ng-snapshot',
    'jest-preset-angular/build/serializers/html-comment'
  ],
  collectCoverage: true,
  coverageDirectory: '<rootDir>/reports/coverage/',
  coveragePathIgnorePatterns: ignoredPathPatterns,
  coverageReporters: ['json', 'text', 'lcov', 'text-summary'],
  reporters: [
    'default',
    [
      'jest-sonar',
      {
        outputDirectory: 'reports',
        outputName: 'sonarqube_report.xml',
        reportedFilePath: 'absolute'
      }
    ]
  ]
}

export default config
