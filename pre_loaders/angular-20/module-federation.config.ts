import { ModuleFederationConfig, SharedLibraryConfig } from '@nx/module-federation'
import { getOneCXSharedLibraryConfig, getOneCXSharedRecommendations } from '@onecx/build-utils'

/**
 * ***************************************************************
 * Generating additional shared dependencies from package.json
 * Since Nx does not include dependencies from package.json in the project graph, we need to manually add them as shared dependencies in the module federation config. This is a temporary solution until Nx fixes this issue. Removing this without the fix will cause several packages to not be included in remoteEntry file.
 * ***************************************************************
 */

import * as pkg from 'package.json'

const sharedEntriesObject = getOneCXSharedLibraryConfig(pkg.dependencies, true)

// Generated Config with shareScope as default and singleton as false (default) for all dependencies.
// Reduce to array with object entries with libraryName and sharedConfig properties
const sharedEntries = Object.entries(sharedEntriesObject).map(([libraryName, sharedConfig]) => ({
  libraryName,
  sharedConfig
}))

const config: ModuleFederationConfig = {
  // 'zzz' prefix is used to prefer this remote over any other remote that might have the same package version in the shared dependencies.
  // magicChar is not suitable for nx tools since angular 20 support since it normalizes to ASCII values.
  // valid ASCII characters like '~' did not work as a prefix for some reason and were normalized to '_'
  name: 'zzz_onecx-angular-20-loader',
  exposes: {
    ['./Angular20Loader']: 'src/main.ts'
  },
  shared: (libraryName, sharedConfig) => {
    const config = getOneCXSharedRecommendations(libraryName, sharedConfig)
    // Add custom shared configurations to the config object if needed
    return config
  },
  additionalShared: sharedEntries // This will add the additional shared dependencies generated from package.json to the module federation config
}

export default config
