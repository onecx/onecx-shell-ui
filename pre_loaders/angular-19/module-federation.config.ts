import { ModuleFederationConfig } from '@nx/module-federation'
// TODO: Cherry pick getOneCXSharedRecommendations to accelerator v6
import { getOneCXSharedRecommendations } from '@onecx/accelerator'

const config: ModuleFederationConfig = {
  name: 'onecx-angular-19-loader',
  exposes: {
    ['./Angular19Loader']: 'src/main.ts'
  },
  shared: (libraryName, sharedConfig) => {
    const config = getOneCXSharedRecommendations(libraryName, sharedConfig)
    // Add custom shared configurations to the config object if needed
    return config
  }
}

export default config
