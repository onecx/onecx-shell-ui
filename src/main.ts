import {
  angular18Preloader,
  angular19Preloader,
  angular20Preloader,
  ensurePreloaderModuleLoaded,
  loadPreloaderModule
} from './app/shell/utils/preloader.utils'

window['onecxPreloaders'] ??= {}
const testApp = {
  name: 'testApp',
  relativeRemoteEntryUrl: 'pre_loaders/test-app/remoteEntry.mjs',
  windowKey: 'testApp',
  exposedModule: 'TestApp',
  shareScope: 'angular_20'
}
const preloaders = [angular18Preloader, angular19Preloader, angular20Preloader]

Promise.all([...preloaders.map(loadPreloaderModule), ...preloaders.map(ensurePreloaderModuleLoaded)])
  .then(() => {
    return import('./bootstrap').catch((err) => console.error(err))
  })
  .then(() => {
    return loadPreloaderModule(testApp).catch((err) => console.error(err))
  })
