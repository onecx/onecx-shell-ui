import { bootstrapModule } from '@onecx/angular-webcomponents'
import { AppModule } from './app/app.module'
import { environment } from './environments/environment'
import { angular18DummyLoader, ensureDummyModuleLoaded, loadDummyModule } from './app/shell/utils/dummy-loader.utils'

bootstrapModule(AppModule, 'shell', environment.production).then(() => {
  window['onecxDummy'] ??= {}
  const dummyLoaders = [angular18DummyLoader]

  return Promise.all([...dummyLoaders.map(loadDummyModule), ...dummyLoaders.map(ensureDummyModuleLoaded)])
})
