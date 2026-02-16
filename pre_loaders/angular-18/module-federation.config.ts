import { ModuleFederationConfig } from '@nx/module-federation'

const config: ModuleFederationConfig = {
  // TODO: Think of a better way to name the remote
  name: 'z_onecx-angular-18-loader',
  exposes: {
    ['./Angular18Loader']: 'src/main.ts'
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
