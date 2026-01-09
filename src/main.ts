// Polyfill zone.js for Angular's change detection mechanism
import 'zone.js'
// Global styles
// NOTE: On development mode, these styles are inlined into index.html by Vite
// but its done later than in production build, so the variables might not be available from the start
import './global-styles.scss'

import {
  angular18Preloader,
  angular19Preloader,
  angular20Preloader,
  ensurePreloaderModuleLoaded,
  loadPreloaderModule
} from './app/shell/utils/preloader.utils'
import { bootstrapModule } from '@onecx/angular-webcomponents'
import { Capability, ShellCapabilityService } from '@onecx/angular-integration-interface'
import { AppModule } from './app/app.module'
import { environment } from './environments/environment'
ShellCapabilityService.setCapabilities([
  Capability.PARAMETERS_TOPIC,
  Capability.CURRENT_LOCATION_TOPIC,
  Capability.ACTIVENESS_AWARE_MENUS
])

window['onecxPreloaders'] ??= {}
const preloaders = [angular18Preloader, angular19Preloader, angular20Preloader]

Promise.all([...preloaders.map(loadPreloaderModule), ...preloaders.map(ensurePreloaderModuleLoaded)]).then(() => {
  bootstrapModule(AppModule, 'shell', environment.production)
})
