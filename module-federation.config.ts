import { ModuleFederationConfig } from '@nx/module-federation'

// TODO: Move to libs
const config: ModuleFederationConfig = {
  name: 'onecx-shell-ui',
  remotes: [],
  exposes: {
    './OneCXVersionInfoComponent': 'src/app/remotes/version-info/version-info.component.main.ts'
  },
  shared: (libraryName, sharedConfig) => {
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
    sharedConfig.requiredVersion = 'auto'
    return sharedConfig
  }
}

export default config
