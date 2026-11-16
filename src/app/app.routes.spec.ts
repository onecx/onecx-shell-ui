import { appRoutes, internalShellRoute } from './app.routes'

describe('app routes', () => {
  it('loads each lazy route module and exposes the internal shell route', async () => {
    const modules = await Promise.all(
      appRoutes.map((route) => {
        if (typeof route.loadChildren !== 'function') {
          throw new Error(`Route ${route.path} does not have a lazy module`)
        }
        return route.loadChildren()
      })
    )

    expect(appRoutes.map((route) => route.path)).toEqual([
      'portal-initialization-error-page',
      'remote-loading-error-page',
      `${internalShellRoute}/about-shell`
    ])
    expect(modules).toEqual([expect.any(Function), expect.any(Function), expect.any(Function)])
  })
})
