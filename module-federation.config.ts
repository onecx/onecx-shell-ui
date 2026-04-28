import { ModuleFederationConfig } from '@nx/module-federation'
import { getOneCXSharedRecommendations } from '@onecx/accelerator'
// TODO: Mention this file in guide for app refactoring
const config: ModuleFederationConfig = {
  name: 'onecx-shell-ui',
  exposes: {
    './OneCXShellToastComponent': 'src/app/remotes/shell-toast/shell-toast.component.main.ts'
  },
  shared: (libraryName, sharedConfig) => {
    const config = getOneCXSharedRecommendations(libraryName, sharedConfig)
    // Add custom shared configurations to the config object if needed
    return config
  }
}

export default config
