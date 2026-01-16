import { ModuleFederationConfig } from '@nx/module-federation'

const config: ModuleFederationConfig = {
  // Name has to match project name
  name: 'z_onecx-angular-20-loader',
  exposes: {
    ['./Angular20Loader']: 'src/main.ts'
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
    return sharedConfig
  }
}

export default config
