import { ModuleFederationConfig, SharedLibraryConfig } from '@nx/module-federation'
import { getOneCXSharedRecommendations } from '@onecx/accelerator'
import * as path from 'path'

import * as pkg from 'package.json'

const EXPORTS_BLACKLIST = ['.', './package.json']

const DEPENDENCY_BLACKLIST = [
  '@nx/angular',
  '@nx/module-federation',
  '@module-federation/enhanced',
  '@module-federation/runtime-core',
  '@module-federation/dts-plugin'
]

const FULL_PACKAGE_BLACKLIST = [
  '@angular/common/locales/global/*',
  '@angular/common/locales/*',
  '@angular/common/upgrade',
  '@angular/core/schematics/*',
  '@angular/core/event-dispatch-contract.min.js',
  '@angular/service-worker/ngsw-worker.js',
  '@angular/service-worker/safety-worker.js',
  '@angular/service-worker/config/schema.json',
  '@angular/router/upgrade',
  '@angular/localize/tools',
  'rxjs/internal/*',
  'primeng/resources/',
  'primeng/editor',
  '@onecx/angular-accelerator/testing',
  '@onecx/angular-accelerator/migrations.json'
]

function removeExportPrefix(str: string) {
  return str.replace('./', '')
}

function generatePackages(pkg: Record<string, any>, dependency: string): string[] {
  if (DEPENDENCY_BLACKLIST.includes(dependency)) {
    return []
  }

  const result = [dependency]
  const dependencyPackagePath = path.join('node_modules', dependency, 'package.json')
  // read the package.json of the dependency and check if it has exports field, if it does, generate import statements for each export except the ones in the blacklist
  if (require('fs').existsSync(dependencyPackagePath)) {
    const dependencyPackage = require(dependencyPackagePath)
    if (dependencyPackage.exports) {
      const exports = dependencyPackage.exports
      const exportKeys = Object.keys(exports)
      for (const exportKey of exportKeys) {
        if (EXPORTS_BLACKLIST.includes(exportKey)) continue
        const fullPackage = `${dependency}/${removeExportPrefix(exportKey)}`
        if (FULL_PACKAGE_BLACKLIST.includes(fullPackage)) continue
        result.push(fullPackage)
      }
    }
  }

  return result
}

const allDependencies: Array<string> = Object.keys(pkg.dependencies).flatMap((d) => {
  return generatePackages(pkg, d)
})
// nx since 22.2.4 is not generating project graph with dependencies from package.json, so we need to manually add them as shared dependencies in the module federation config until its fixed. Removing this without the fix will cause several packages to not be included in remoteEntry file
const additionalShared = allDependencies
  .map((d) => {
    return {
      libraryName: d,
      sharedConfig: getOneCXSharedRecommendations(d, {})
    }
  })
  .filter((config): config is { libraryName: string; sharedConfig: SharedLibraryConfig } => !!config.sharedConfig)

console.log('aS', additionalShared)

const config: ModuleFederationConfig = {
  name: 'onecx-angular-21-loader',
  exposes: {
    ['./Angular21Loader']: 'src/main.ts'
  },
  shared: (libraryName, sharedConfig) => {
    const config = getOneCXSharedRecommendations(libraryName, sharedConfig)
    // Add custom shared configurations to the config object if needed
    return config
  },
  additionalShared: additionalShared
}

export default config
