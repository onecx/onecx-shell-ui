import { ModuleFederationConfig } from '@nx/module-federation'

const config: ModuleFederationConfig = {
  name: 'onecx-shell-ui',
  exposes: {
    './OneCXShellToastComponent': 'src/app/remotes/shell-toast/shell-toast.component.main.ts'
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
