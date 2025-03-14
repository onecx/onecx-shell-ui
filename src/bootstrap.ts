import { bootstrapModule } from '@onecx/angular-webcomponents'
import { AppModule } from './app/app.module'
import { environment } from './environments/environment'
import { angular18Preloader, ensurePreloaderModuleLoaded, loadPreloaderModule } from './app/shell/utils/preloader.utils'

bootstrapModule(AppModule, 'shell', environment.production).then(() => {
  window['onecxPreloaders'] ??= {}
  const preloaders = [angular18Preloader]

  return Promise.all([...preloaders.map(loadPreloaderModule), ...preloaders.map(ensurePreloaderModuleLoaded)])
})
