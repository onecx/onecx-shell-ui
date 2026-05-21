import { ensureProperty } from '@onecx/accelerator'
import {
  angular18Preloader,
  angular19Preloader,
  angular20Preloader,
  angular21Preloader,
  ensurePreloaderModuleLoaded,
  loadPreloaderModule
} from './app/shell/utils/preloader.utils'

// Make sure the shell federation instance is available globally
ensureProperty(globalThis, ['onecxFederationInstance'], __FEDERATION__.__INSTANCES__[0])

window['onecxPreloaders'] ??= {}
const preloaders = [angular18Preloader, angular19Preloader, angular20Preloader, angular21Preloader]

Promise.all([...preloaders.map(loadPreloaderModule), ...preloaders.map(ensurePreloaderModuleLoaded)]).then(() => {
  return import('./bootstrap').catch((err) => console.error(err))
})
