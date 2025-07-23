import type { Config } from 'jest'

// list of patterns for which no transformation/transpiling should be run
const ignoredModulePatterns: string = ['d3-.*', '(.*\.mjs$)'].join('|')

const config: Config = {
  displayName: 'onecx-shell-ui',
  silent: true,
  verbose: false,
  testEnvironment: 'jsdom',
  preset: './jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  testMatch: ['<rootDir>/src/app/**/*.spec.ts'],
  moduleNameMapper: {
    '@primeng/themes': '<rootDir>/node_modules/@primeng/themes/index.mjs'
  },
  transformIgnorePatterns: [`node_modules/(?!${ignoredModulePatterns})`],
  transform: {
    '^.+[^.].\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$'
      }
    ]
  },
  snapshotSerializers: [
    'jest-preset-angular/build/serializers/no-ng-attributes',
    'jest-preset-angular/build/serializers/ng-snapshot',
    'jest-preset-angular/build/serializers/html-comment'
  ],
  collectCoverage: true,
  coverageDirectory: '<rootDir>/reports/coverage/',
  coveragePathIgnorePatterns: [
    '<rootDir>/pre_loaders/',
    '<rootDir>/src/main.ts',
    '<rootDir>/src/bootstrap.ts',
    '<rootDir>/src/app/shared/generated'
  ],
  coverageReporters: ['json', 'text', 'text-summary', 'html'],
  testResultsProcessor: 'jest-sonar-reporter',
  reporters: [
    'default',
    [
      'jest-sonar',
      {
        outputDirectory: './reports',
        outputName: 'sonarqube_report.xml',
        reportedFilePath: 'absolute'
      }
    ]
  ],
  testPathIgnorePatterns: ['/node_modules/', '/pre_loaders/', '/src/main.ts', '/src/bootstrap.ts']
}

export default config
