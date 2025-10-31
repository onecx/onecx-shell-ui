import {
  angular18Preloader,
  angular19Preloader,
  angular20Preloader,
  ensurePreloaderModuleLoaded,
  loadPreloaderModule
} from './app/shell/utils/preloader.utils'
import { init } from '@module-federation/enhanced/runtime'
window['onecxPreloaders'] ??= {}
const preloaders = [angular18Preloader, angular19Preloader, angular20Preloader]

Promise.all([...preloaders.map(loadPreloaderModule), ...preloaders.map(ensurePreloaderModuleLoaded)]).then(() => {
  // Not working for some reason
  // createInstance({
  //   name: 'onecx-shell-ui',
  //   remotes: []
  // })
  init({
    name: 'onecx-shell-ui',
    remotes: []
  })
  import('./bootstrap').catch((err) => console.error(err))
})
