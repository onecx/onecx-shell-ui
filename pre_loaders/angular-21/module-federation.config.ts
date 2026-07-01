import { ModuleFederationConfig } from '@nx/module-federation'
import { getOneCXSharedLibraryConfig, getOneCXSharedRecommendations } from '@onecx/build-utils'

import * as pkg from 'package.json'

const sharedEntriesObject = getOneCXSharedLibraryConfig(pkg.dependencies, true, {
  configCallback: (packageName, currentConfig) => {
    // For @angular packages set singleton: true
    if (packageName.startsWith('@angular/')) {
      currentConfig.singleton = true
    }
    return currentConfig
  }
})
// Reduce to array with object entries with libraryName and sharedConfig properties
const sharedEntries = Object.entries(sharedEntriesObject).map(([libraryName, sharedConfig]) => ({
  libraryName,
  sharedConfig
}))

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
    // For @angular packages set singleton: true
    if (libraryName.startsWith('@angular/') && config instanceof Object) {
      config.singleton = true
    }
    return config
  },
  additionalShared: sharedEntries // This will add the additional shared dependencies generated from package.json to the module federation config
}

export default config
