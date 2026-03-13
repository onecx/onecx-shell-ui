import { ModuleFederationConfig } from '@nx/module-federation'
// TODO: Cherry pick getOneCXSharedRecommendations to accelerator v7
import { getOneCXSharedRecommendations } from '@onecx/accelerator'

const config: ModuleFederationConfig = {
  name: 'onecx-angular-21-loader',
  exposes: {
    ['./Angular21Loader']: 'src/main.ts'
  },
  shared: (libraryName, sharedConfig) => {
    const config = getOneCXSharedRecommendations(libraryName, sharedConfig)
    // Add custom shared configurations to the config object if needed
    return config
  }
}

export default config
