import { ModuleFederationConfig } from '@nx/module-federation'
import { getOneCXSharedRecommendations } from '@onecx/accelerator'

const config: ModuleFederationConfig = {
  name: 'onecx-angular-18-loader',
  exposes: {
    ['./Angular18Loader']: 'src/main.ts'
  },
  shared: (libraryName, sharedConfig) => {
    const config = getOneCXSharedRecommendations(libraryName, sharedConfig)
    // Add custom shared configurations to the config object if needed
    return config
  }
}

export default config
