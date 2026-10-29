import {
  angular18Preloader,
  angular19Preloader,
  angular20Preloader,
  angular21Preloader,
  react19Preloader,
  ensurePreloaderModuleLoaded,
  loadPreloaderModule
} from './app/shell/utils/preloader.utils'
import { registerGlobalPlugins } from '@module-federation/enhanced/runtime'
import mfRuntimePlugin, { loadAllowedPackageGroupsForMFPlugin } from './app/shell/plugins/mf-runtime-plugin'

// Make shell federation instance is available globally
const shellInstance = __FEDERATION__.__INSTANCES__[0]
;(globalThis as any)['onecxFederationInstance'] = shellInstance

const registerPlugins = async () => {
  await loadAllowedPackageGroupsForMFPlugin()
  registerGlobalPlugins([mfRuntimePlugin()])
}

window['onecxPreloaders'] ??= {}
const preloaders = [angular18Preloader, angular19Preloader, angular20Preloader, angular21Preloader, react19Preloader]

const bootstrapShell = async () => {
  await registerPlugins()
  await Promise.all([...preloaders.map(loadPreloaderModule), ...preloaders.map(ensurePreloaderModuleLoaded)])
  await import('./bootstrap')
}

bootstrapShell().catch((err) => console.error(err))
