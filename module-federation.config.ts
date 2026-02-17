import { ModuleFederationConfig } from '@nx/module-federation'
// TODO: Mention this file in guide for app refactoring
// TODO: Move shared config to accelerator package and improve function logic
const config: ModuleFederationConfig = {
  name: 'onecx-shell-ui',
  exposes: {
    './OneCXShellToastComponent': 'src/app/remotes/shell-toast/shell-toast.component.main.ts'
  },
  shared: (libraryName, sharedConfig) => {
    // TODO const config = getOneCXRecommendations(libraryName, sharedConfig)
    // TODO Config can be further customized here if needed
    // return config
    if (
      !libraryName.startsWith('@angular') &&
      !libraryName.startsWith('@onecx') &&
      !libraryName.startsWith('rxjs') &&
      !libraryName.startsWith('primeng') &&
      !libraryName.startsWith('@ngx-translate')
    ) {
      return false
    }
    sharedConfig.singleton = false
    sharedConfig.strictVersion = false
    sharedConfig.eager = false
    return sharedConfig
  }
}

export default config
