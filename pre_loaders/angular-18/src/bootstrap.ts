import { PreloaderModule, cachePlatform, getNgZone } from './bootstrap-utils'

cachePlatform(true)
  .bootstrapModule(PreloaderModule, {
    ngZone: getNgZone()
  })
  .then((ref) => {
    return ref
  })
