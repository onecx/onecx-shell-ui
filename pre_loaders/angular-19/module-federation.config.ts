import { ModuleFederationConfig } from '@nx/module-federation'

const config: ModuleFederationConfig = {
  name: 'onecx-angular-19-loader',
  exposes: {
    ['./Angular19Loader']: 'src/main.ts'
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
