import { ModuleFederationConfig, SharedLibraryConfig } from '@nx/module-federation'
import { getOneCXSharedRecommendations } from '@onecx/accelerator'
import * as path from 'path'

/**
 * ***************************************************************
 * Generating additional shared dependencies from package.json
 * Since Nx does not include dependencies from package.json in the project graph, we need to manually add them as shared dependencies in the module federation config. This is a temporary solution until Nx fixes this issue. Removing this without the fix will cause several packages to not be included in remoteEntry file.
 * ***************************************************************
 */

import * as pkg from 'package.json'

type SharedDependency = {
  name: string
  requiredVersion: string
}

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

function generatePackages(pkg: Record<string, any>, dependency: string): Array<SharedDependency> {
  if (DEPENDENCY_BLACKLIST.includes(dependency)) {
    return []
  }

  const requiredVersion = pkg['dependencies'][dependency]

  const result = [{ name: dependency, requiredVersion: requiredVersion }]
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
        result.push({ name: fullPackage, requiredVersion: requiredVersion })
      }
    }
  }

  return result
}

const allDependencies: Array<SharedDependency> = Object.keys(pkg.dependencies).flatMap((d) => {
  return generatePackages(pkg, d)
})
const additionalShared = allDependencies
  .map((d) => {
    return {
      libraryName: d.name,
      sharedConfig: getOneCXSharedRecommendations(d.name, { requiredVersion: d.requiredVersion })
    }
  })
  .filter((config): config is { libraryName: string; sharedConfig: SharedLibraryConfig } => !!config.sharedConfig)

/**
 * ***************************************************************
 * End of additional shared dependencies generation
 * ***************************************************************
 */

const config: ModuleFederationConfig = {
  // 'zzz' prefix is used to prefer this remote over any other remote that might have the same package version in the shared dependencies. 
  // magicChar is not suitable for nx tools since angular 20 support since it normalizes to ASCII values.
  // valid ASCII characters like '~' did not work as a prefix for some reason and were normalized to '_'
  name: 'zzz_onecx-angular-21-loader',
  exposes: {
    ['./Angular21Loader']: 'src/main.ts'
  },
  shared: (libraryName, sharedConfig) => {
    const config = getOneCXSharedRecommendations(libraryName, sharedConfig)
    // Add custom shared configurations to the config object if needed
    return config
  },
  additionalShared: additionalShared // This will add the additional shared dependencies generated from package.json to the module federation config
}

export default config
