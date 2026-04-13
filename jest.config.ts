import type { Config } from 'jest'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

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

/**
 * Scans installed packages for subpath exports that lack physical directories.
 * Generates tsconfig paths (for TS compilation) and moduleNameMapper entries (for Jest runtime).
 * This avoids manually adding path mappings whenever a new subpath import is used.
 */
function resolvePackageExports(rootDir: string) {
  const pkgJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'))
  const allDeps = { ...pkgJson.dependencies, ...pkgJson.devDependencies }

  const tsPaths: Record<string, string[]> = {}
  const moduleNameMapper: Record<string, string> = {}

  for (const pkgName of Object.keys(allDeps)) {
    let depPkg: any
    try {
      depPkg = JSON.parse(readFileSync(join(rootDir, 'node_modules', pkgName, 'package.json'), 'utf-8'))
    } catch {
      continue
    }

    const exports = depPkg.exports
    if (!exports || typeof exports !== 'object') continue

    for (const [subpath, mapping] of Object.entries(exports)) {
      if (subpath === '.' || subpath === './package.json' || subpath.includes('*')) continue

      const subpathClean = subpath.replace(/^\.\//, '')
      const importSpecifier = `${pkgName}/${subpathClean}`

      // Only generate mappings when there is no physical path (standard resolution would fail)
      const physicalPath = join(rootDir, 'node_modules', pkgName, subpathClean)
      if (existsSync(physicalPath) || existsSync(physicalPath + '.js') || existsSync(physicalPath + '.d.ts')) {
        continue
      }

      let types: string | undefined
      let defaultExport: string | undefined

      if (typeof mapping === 'string') {
        defaultExport = mapping
      } else if (mapping && typeof mapping === 'object') {
        const m = mapping as Record<string, any>
        types = m.types
        defaultExport = m.default
      }

      if (types) {
        tsPaths[importSpecifier] = [`./node_modules/${pkgName}/${types.replace(/^\.\//, '')}`]
      }
      if (defaultExport) {
        const escaped = importSpecifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        moduleNameMapper[`^${escaped}$`] = `<rootDir>/node_modules/${pkgName}/${defaultExport.replace(/^\.\//, '')}`
      }
    }
  }

  return { tsPaths, moduleNameMapper }
}

const { tsPaths, moduleNameMapper: exportMapper } = resolvePackageExports(__dirname)

const config: Config = {
  displayName: 'onecx-shell-ui',
  silent: true,
  verbose: false,
  testEnvironment: 'jsdom',
  preset: './jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  snapshotSerializers: [
    'jest-preset-angular/build/serializers/no-ng-attributes',
    'jest-preset-angular/build/serializers/ng-snapshot',
    'jest-preset-angular/build/serializers/html-comment'
  ],
  testMatch: ['<rootDir>/src/app/**/*.spec.ts'],
  testPathIgnorePatterns: ignoredPathPatterns,
  // transformation
  moduleNameMapper: {
    ...exportMapper
  },
  transformIgnorePatterns: [`node_modules/(?!${ignoredModulePatterns})`],
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: {
          esModuleInterop: true,
          outDir: './dist/out-tsc',
          target: 'es2016',
          types: ['jest', 'node'],
          paths: tsPaths
        },
        stringifyContentPathRegex: '\\.(html|svg)$'
      }
    ]
  },
  // reporting
  collectCoverage: true,
  coverageDirectory: '<rootDir>/reports/coverage/',
  coveragePathIgnorePatterns: ignoredPathPatterns,
  coverageReporters: ['json', 'text', 'lcov', 'text-summary', 'html'],
  testResultsProcessor: 'jest-sonar-reporter',
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
