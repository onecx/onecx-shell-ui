import { ModuleFederationConfig } from '@nx/module-federation'
import { getOneCXSharedLibraryConfig, getOneCXSharedRecommendations } from '@onecx/build-utils'

import * as pkg from 'package.json'

const SINGLETON_PREFIXES = ['@onecx/']
const SINGLETON_PACKAGES = ['react', 'react-dom', 'i18next', 'react-i18next', 'react-router', 'primereact']

function isSingletonPackage(name: string): boolean {
  return SINGLETON_PREFIXES.some((prefix) => name.startsWith(prefix)) || SINGLETON_PACKAGES.includes(name)
}

const sharedEntriesObject = getOneCXSharedLibraryConfig(pkg.dependencies, true, {
  configCallback: (packageName, currentConfig) => {
    if (isSingletonPackage(packageName)) {
      currentConfig.singleton = true
    }
    return currentConfig
  }
})
const sharedEntries = Object.entries(sharedEntriesObject).map(([libraryName, sharedConfig]) => ({
  libraryName,
  sharedConfig
}))

const config: ModuleFederationConfig = {
  name: 'zzz_onecx-react-19-loader',
  exposes: {
    ['./React19Loader']: 'src/main.ts'
  },
  shared: (libraryName, sharedConfig) => {
    const config = getOneCXSharedRecommendations(libraryName, sharedConfig)
    if (isSingletonPackage(libraryName) && config instanceof Object) {
      config.singleton = true
    }
    return config
  },
  additionalShared: sharedEntries
}

export default config
