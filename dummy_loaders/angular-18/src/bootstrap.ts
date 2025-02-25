import { DummyModule, cachePlatform, getNgZone } from './bootstrap-utils'

cachePlatform(true)
  .bootstrapModule(DummyModule, {
    ngZone: getNgZone()
  })
  .then((ref) => {
    return ref
  })
