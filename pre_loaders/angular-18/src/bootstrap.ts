import { PreloaderModule } from './bootstrap-utils'
import { cachePlatform, getNgZone } from '@onecx/angular-webcomponents'

cachePlatform(true)
  .bootstrapModule(PreloaderModule, {
    ngZone: getNgZone()
  })
  .then((ref) => {
    return ref
  })
