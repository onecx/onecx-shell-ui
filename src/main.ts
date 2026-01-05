console.log('Loading dependencies and global styles...')
// Polyfill zone.js for Angular's change detection mechanism
import 'zone.js'
// Global styles
import './splash.scss'
import './global-styles.scss'
// Pre-processed styles for correct processing of exposed style sheets
// Put any style sheets that are requires to be pre-processed here
import 'primeicons/primeicons.css'
// import './portal-layout-styles.scss?inline'
// import './shell-styles.scss?inline'

// import {
//   angular18Preloader,
//   angular19Preloader,
//   angular20Preloader,
//   ensurePreloaderModuleLoaded,
//   loadPreloaderModule
// } from './app/shell/utils/preloader.utils'
// import { init } from '@module-federation/enhanced/runtime'
// window['onecxPreloaders'] ??= {}
// const preloaders = [angular18Preloader, angular19Preloader, angular20Preloader]

// Promise.all([...preloaders.map(loadPreloaderModule), ...preloaders.map(ensurePreloaderModuleLoaded)]).then(() => {
// Not working for some reason
// createInstance({
//   name: 'onecx-shell-ui',
//   remotes: []
// })
// init({
//   name: 'onecx-shell-ui',
//   remotes: []
// })
import { bootstrapModule } from '@onecx/angular-webcomponents'
import { Capability, ShellCapabilityService } from '@onecx/angular-integration-interface'
import { AppModule } from './app/app.module'
import { environment } from './environments/environment'

ShellCapabilityService.setCapabilities([
  Capability.PARAMETERS_TOPIC,
  Capability.CURRENT_LOCATION_TOPIC,
  Capability.ACTIVENESS_AWARE_MENUS
])
bootstrapModule(AppModule, 'shell', environment.production)

// })
