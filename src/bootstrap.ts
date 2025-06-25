import { bootstrapModule } from '@onecx/angular-webcomponents'
import { Capability, ShellCapabilityService } from '@onecx/angular-integration-interface'
import { AppModule } from './app/app.module'
import { environment } from './environments/environment'
import {
  angular18Preloader,
  angular19Preloader,
  angular20Preloader,
  ensurePreloaderModuleLoaded,
  loadPreloaderModule
} from './app/shell/utils/preloader.utils'

ShellCapabilityService.setCapabilities([Capability.PARAMETERS_TOPIC, Capability.CURRENT_LOCATION_TOPIC])
bootstrapModule(AppModule, 'shell', environment.production).then(() => {
  window['onecxPreloaders'] ??= {}
  const preloaders = [angular18Preloader, angular19Preloader, angular20Preloader]

  return Promise.all([...preloaders.map(loadPreloaderModule), ...preloaders.map(ensurePreloaderModuleLoaded)])
})
