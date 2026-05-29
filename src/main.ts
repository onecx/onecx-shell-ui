import {
  angular18Preloader,
  angular19Preloader,
  angular20Preloader,
  angular21Preloader,
  ensurePreloaderModuleLoaded,
  loadPreloaderModule,
  react19Preloader
} from './app/shell/utils/preloader.utils'

// Make shell federation instance is available globally
;(globalThis as any)['onecxFederationInstance'] = __FEDERATION__.__INSTANCES__[0]

window['onecxPreloaders'] ??= {}
const preloaders = [angular18Preloader, angular19Preloader, angular20Preloader, angular21Preloader, react19Preloader]

Promise.all([...preloaders.map(loadPreloaderModule), ...preloaders.map(ensurePreloaderModuleLoaded)]).then(() => {
  return import('./bootstrap').catch((err) => console.error(err))
})
