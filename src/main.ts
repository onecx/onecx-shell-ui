import {
  angular18Preloader,
  angular19Preloader,
  angular20Preloader,
  ensurePreloaderModuleLoaded,
  loadPreloaderModule
} from './app/shell/utils/preloader.utils'

window['onecxPreloaders'] ??= {}
const preloaders = [angular18Preloader, angular19Preloader, angular20Preloader]

import('@module-federation/enhanced/runtime')
  .then(({ init }) => {
    init({
      name: 'onecx-shell-ui',
      remotes: []
    })
  })
  .then(() => {
    return Promise.all([...preloaders.map(loadPreloaderModule), ...preloaders.map(ensurePreloaderModuleLoaded)]).then(
      () => {
        return import('./bootstrap').catch((err) => console.error(err))
      }
    )
  })
