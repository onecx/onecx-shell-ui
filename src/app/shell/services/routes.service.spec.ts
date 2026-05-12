import { TestBed } from '@angular/core/testing'
import { of } from 'rxjs'
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { NavigationEnd, NavigationSkipped, Router, provideRouter } from '@angular/router'
import { updateStylesForMfeChange } from '@onecx/angular-utils/style'
import { getLocation } from '@onecx/accelerator'
import { loadRemote } from '@module-federation/enhanced/runtime'

import { DEFAULT_CATCH_ALL_ROUTE, RoutesService } from './routes.service'

// External services to mock
import { ConfigurationService, PortalMessageService } from '@onecx/angular-integration-interface'
import { AppStateServiceMock, provideAppStateServiceMock } from '@onecx/angular-integration-interface/mocks'
import { PathMatch, PermissionBffService, Route, Technologies } from 'src/app/shared/generated'
import { PermissionsCacheService } from './permissions-cache.service'
import { WebcomponentLoaderModule } from '../web-component-loader/webcomponent-loader.module'
import { appRoutes } from 'src/app/app.routes'

jest.mock('@module-federation/enhanced/runtime', () => ({
  loadRemote: jest.fn(),
  registerRemotes: jest.fn()
}))

jest.mock('@onecx/angular-utils/style', () => ({
  updateStylesForMfeChange: jest.fn().mockResolvedValue(undefined)
}))

jest.mock('@onecx/accelerator', () => ({
  ...jest.requireActual('@onecx/accelerator'),
  getLocation: jest.fn().mockReturnValue({ applicationPath: '/requested/path' })
}))

describe('RoutesService', () => {
  let routerService: RoutesService
  let router: Router

  let appStateServiceMock: AppStateServiceMock

  const loadRemoteMock = loadRemote as jest.MockedFunction<typeof loadRemote>
  const updateStylesForMfeChangeMock = updateStylesForMfeChange as jest.MockedFunction<typeof updateStylesForMfeChange>
  const getLocationMock = getLocation as jest.MockedFunction<typeof getLocation>

  const mockPortalMessageService: Partial<PortalMessageService> = {
    error: jest.fn()
  }

  const mockConfigurationService: Partial<ConfigurationService> = {
    getProperty: jest.fn().mockResolvedValue('')
  }

  const mockPermissionsCacheService: Partial<PermissionsCacheService> = {
    getPermissions: jest.fn().mockImplementation((appId, productName, resolver) => resolver(appId, productName))
  }

  const mockPermissionBffService: Partial<PermissionBffService> = {
    getPermissions: jest.fn().mockReturnValue(of({ permissions: ['P_READ'] }))
  }

  const notFoundCount = 1
  const appRouteCount = appRoutes.length
  const fallbackRouteCount = 1

  const createBffRoute = (partial: Partial<Route> = {}): Route => ({
    url: '/mfe/welcome/',
    baseUrl: '/admin/welcome/',
    remoteEntryUrl: '/mfe/welcome/remoteEntry.js',
    appId: 'onecx-welcome-ui',
    productName: 'onecx-welcome',
    productVersion: '1.9.0-rc.38',
    exposedModule: './OneCXWelcomeModule',
    pathMatch: PathMatch.prefix,
    displayName: 'OneCX Welcome',
    technology: Technologies.WebComponentModule,
    remoteName: 'onecx-welcome',
    elementName: 'ocx-welcome-component',
    endpoints: [],
    ...partial
  })

  const emitRouterEvent = (event: unknown) => {
    const routerAsAny = router as any
    if (typeof routerAsAny.events?.next === 'function') {
      routerAsAny.events.next(event as any)
      return
    }
    if (typeof routerAsAny.eventsSubject?.next === 'function') {
      routerAsAny.eventsSubject.next(event as any)
      return
    }
    if (typeof routerAsAny._events?.next === 'function') {
      routerAsAny._events.next(event as any)
    }
  }

  const emitNavigationEnd = () => {
    emitRouterEvent(new NavigationEnd(1, '/from', '/to'))
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    loadRemoteMock.mockResolvedValue({ OneCXWelcomeModule: { moduleName: 'MockWelcomeModule' } })
    ;(mockConfigurationService.getProperty as jest.Mock).mockResolvedValue('')

    await TestBed.configureTestingModule({
      providers: [
        RoutesService,
        provideRouter([]),
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideAppStateServiceMock(),
        { provide: PortalMessageService, useValue: mockPortalMessageService },
        { provide: ConfigurationService, useValue: mockConfigurationService },
        { provide: PermissionsCacheService, useValue: mockPermissionsCacheService },
        { provide: PermissionBffService, useValue: mockPermissionBffService }
      ]
    }).compileComponents()

    routerService = TestBed.inject(RoutesService)
    router = TestBed.inject(Router)
    appStateServiceMock = TestBed.inject(AppStateServiceMock)
    await appStateServiceMock.currentWorkspace$.publish({ baseUrl: '/' } as any)
    await appStateServiceMock.globalLoading$.publish(false)
  })

  it('should instantiate', () => {
    expect(routerService).toBeTruthy()
    expect(router).toBeTruthy()
  })

  describe('init', () => {
    it('creates default routes when no routes are provided', async () => {
      await routerService.init([])
      expect(router.config).toBeDefined()
      expect(router.config.length).toBe(notFoundCount + fallbackRouteCount + appRouteCount)
      expect(router.config.find((r) => r.path === '**')).toBeDefined()
      expect(router.config.find((r) => r.path === 'portal-initialization-error-page')).toBeDefined()
      expect(router.config.find((r) => r.path === 'remote-loading-error-page')).toBeDefined()

      const welcomeRoute = router.config.find((r) => r.path === '')
      expect(welcomeRoute).toBeDefined()
      expect(welcomeRoute?.redirectTo).toBeUndefined()
      expect(welcomeRoute?.loadChildren).toBeDefined()
      expect(welcomeRoute?.pathMatch).toBe(PathMatch.full)
      expect(welcomeRoute?.path).toBe('')
    })

    it('creates a route provided route', async () => {
      const testRoutes: Route[] = [
        {
          url: '/mfe/welcome/',
          baseUrl: '/admin/welcome/',
          remoteEntryUrl: '/mfe/welcome/remoteEntry.js',
          appId: 'onecx-welcome-ui',
          productName: 'onecx-welcome',
          productVersion: '1.9.0-rc.38',
          exposedModule: './OneCXWelcomeModule',
          pathMatch: PathMatch.prefix,
          displayName: 'OneCX Welcome',
          technology: Technologies.WebComponentModule,
          remoteName: 'onecx-welcome',
          elementName: 'ocx-welcome-component',
          endpoints: []
        }
      ]
      await routerService.init(testRoutes)
      expect(router.config.length).toBe(testRoutes.length + notFoundCount + fallbackRouteCount + appRouteCount)
      const createdRoute = router.config.find((r) => r.path === 'admin/welcome')
      expect(createdRoute).toBeDefined()
      expect(createdRoute?.loadChildren).toBeDefined()
      expect(createdRoute?.canActivateChild).toBeDefined()
      expect(createdRoute?.pathMatch).toBe(PathMatch.prefix)
      expect(createdRoute?.data).toBeDefined()
      expect((createdRoute?.data as any).breadcrumb).toBe('onecx-welcome')
      expect((createdRoute?.data as any).module).toBe('./OneCXWelcomeModule')
      expect(createdRoute?.title).toBe('OneCX Welcome')
    })

    it('does not provide a fallback welcome route when there is already a welcome route', async () => {
      const testRoutes: Route[] = [
        {
          url: '/mfe/welcome/',
          baseUrl: '', // Note: empty baseUrl makes this the welcome route
          remoteEntryUrl: '/mfe/welcome/remoteEntry.js',
          appId: 'onecx-welcome-ui',
          productName: 'onecx-welcome',
          productVersion: '1.9.0-rc.38',
          exposedModule: './OneCXWelcomeModule',
          pathMatch: PathMatch.prefix,
          displayName: 'OneCX Welcome',
          technology: Technologies.WebComponentModule,
          remoteName: 'onecx-welcome',
          elementName: 'ocx-welcome-component',
          endpoints: []
        }
      ]
      await routerService.init(testRoutes)
      expect(router.config.length).toBe(testRoutes.length + notFoundCount + appRouteCount)
    })

    it('redirects to welcome if configured in the workspace', async () => {
      const homePage = 'custom-welcome'
      await appStateServiceMock.currentWorkspace$.publish({ baseUrl: '/', homePage } as any)

      await routerService.init([])
      expect(router.config.length).toBe(notFoundCount + fallbackRouteCount + appRouteCount)
      const welcomeRoute = router.config.find((r) => r.path === '')
      expect(welcomeRoute).toBeDefined()
      expect(welcomeRoute?.redirectTo).toBe(homePage)
      expect(welcomeRoute?.pathMatch).toBe(PathMatch.full)
    })

    it('creates default routes when no routes are provided', async () => {
      await routerService.init([])

      expect(router.config).toBeDefined()
      expect(router.config.length).toBe(notFoundCount + fallbackRouteCount + appRouteCount)
      expect(router.config.find((r) => r.path === '**')).toBeDefined()
      expect(router.config.find((r) => r.path === 'portal-initialization-error-page')).toBeDefined()
      expect(router.config.find((r) => r.path === 'remote-loading-error-page')).toBeDefined()

      const welcomeRoute = router.config.find((r) => r.path === '')
      expect(welcomeRoute).toBeDefined()
      expect(welcomeRoute?.redirectTo).toBeUndefined()
      expect(welcomeRoute?.loadChildren).toBeDefined()
      expect(welcomeRoute?.pathMatch).toBe(PathMatch.full)
      expect(welcomeRoute?.path).toBe('')

      await welcomeRoute?.loadChildren?.()
      await DEFAULT_CATCH_ALL_ROUTE.loadChildren?.()
    })

    it('creates provided routes and executes generated route callbacks', async () => {
      const testRoute = createBffRoute({ technology: Technologies.Angular })
      await routerService.init([testRoute])

      expect(router.config.length).toBe(1 + notFoundCount + fallbackRouteCount + appRouteCount)
      const createdRoute = router.config.find((r) => r.path === 'admin/welcome')
      expect(createdRoute).toBeDefined()
      expect(createdRoute?.loadChildren).toBeDefined()
      expect(createdRoute?.canActivateChild).toBeDefined()
      expect(createdRoute?.pathMatch).toBe(PathMatch.prefix)
      expect((createdRoute?.data as any).breadcrumb).toBe('onecx-welcome')
      expect((createdRoute?.data as any).module).toBe('./OneCXWelcomeModule')
      expect(createdRoute?.title).toBe('OneCX Welcome')

      const canActivate = createdRoute?.canActivateChild?.[0] as () => Promise<boolean>
      expect(await canActivate()).toBe(true)

      const loaded = await createdRoute?.loadChildren?.()
      expect(loaded).toBeDefined()
      expect(loadRemoteMock).toHaveBeenCalledWith('onecx-welcome|onecx-welcome-ui/OneCXWelcomeModule')
      expect(updateStylesForMfeChangeMock).toHaveBeenCalledWith(
        testRoute.productName,
        testRoute.appId,
        expect.anything(),
        testRoute.url
      )
      expect(mockPermissionBffService.getPermissions).toHaveBeenCalledWith({
        appId: testRoute.appId,
        productName: testRoute.productName
      })

      const currentMfe = appStateServiceMock.currentMfe$.getValue() as any
      expect(currentMfe.remoteBaseUrl).toBe(testRoute.url)
      expect(currentMfe.baseHref).toBe('/admin/welcome/')
    })

    it('does not provide a fallback welcome route when a matching workspace route exists', async () => {
      const testRoute = createBffRoute({ baseUrl: '' })
      await routerService.init([testRoute])
      expect(router.config.length).toBe(1 + notFoundCount + appRouteCount)
    })

    it('redirects to home page if configured in the workspace', async () => {
      await appStateServiceMock.currentWorkspace$.publish({ baseUrl: '/', homePage: 'custom-welcome' } as any)
      await routerService.init([])

      expect(router.config.length).toBe(notFoundCount + fallbackRouteCount + appRouteCount)
      const welcomeRoute = router.config.find((r) => r.path === '')
      expect(welcomeRoute).toBeDefined()
      expect(welcomeRoute?.redirectTo).toBe('custom-welcome')
      expect(welcomeRoute?.pathMatch).toBe(PathMatch.full)
    })

    it('normalizes baseHref and default pathMatch variants', async () => {
      (mockConfigurationService.getProperty as jest.Mock).mockResolvedValue('/portal')
      const fullMatchRoute = createBffRoute({ baseUrl: '/portal/admin/exact$', pathMatch: undefined })
      const prefixRoute = createBffRoute({
        appId: 'app-2',
        productName: 'prod-2',
        baseUrl: '/portal/admin/prefix/',
        pathMatch: undefined,
        url: '/mfe/prefix/',
        technology: Technologies.WebComponentScript,
        remoteName: 'prefix-remote'
      })

      await routerService.init([prefixRoute, fullMatchRoute])

      const exactRoute = router.config.find((r) => r.path === 'admin/exact')
      const prefRoute = router.config.find((r) => r.path === 'admin/prefix')
      expect(exactRoute?.pathMatch).toBe(PathMatch.full)
      expect(prefRoute?.pathMatch).toBe(PathMatch.prefix)

      await prefRoute?.loadChildren?.()
      expect(loadRemoteMock).toHaveBeenCalledWith('prod-2|app-2/OneCXWelcomeModule')
    })

    it('returns WebcomponentLoaderModule for non-angular routes', async () => {
      const webComponentRoute = createBffRoute({ technology: Technologies.WebComponentModule })
      await routerService.init([webComponentRoute])
      const createdRoute = router.config.find((r) => r.path === 'admin/welcome')
      expect(await createdRoute?.loadChildren?.()).toBe(WebcomponentLoaderModule)
    })

    it('skips app state update if current MFE has same remoteBaseUrl', async () => {
      const testRoute = createBffRoute({ technology: Technologies.Angular })
      await routerService.init([testRoute])
      const createdRoute = router.config.find((r) => r.path === 'admin/welcome')
      const canActivate = createdRoute?.canActivateChild?.[0] as () => Promise<boolean>

      await canActivate()
      const permissionsCallsAfterFirstActivation = (mockPermissionsCacheService.getPermissions as jest.Mock).mock.calls
        .length
      await canActivate()
      const permissionsCallsAfterSecondActivation = (mockPermissionsCacheService.getPermissions as jest.Mock).mock.calls
        .length

      expect(permissionsCallsAfterSecondActivation).toBe(permissionsCallsAfterFirstActivation)
    })

    it('keeps loading state untouched when already globally loading', async () => {
      await appStateServiceMock.globalLoading$.publish(true)
      const publishSpy = jest.spyOn(appStateServiceMock.globalLoading$, 'publish')

      const testRoute = createBffRoute({ technology: Technologies.Angular })
      await routerService.init([testRoute])
      const createdRoute = router.config.find((r) => r.path === 'admin/welcome')
      const canActivate = createdRoute?.canActivateChild?.[0] as () => Promise<boolean>
      await canActivate()

      const values = publishSpy.mock.calls.map((c) => c[0])
      expect(values.includes(false)).toBe(false)
    })

    it('handles remote loading errors', async () => {
      const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true)
      getLocationMock.mockReturnValue({ applicationPath: '/failing-app' } as any)
      loadRemoteMock.mockRejectedValue(new Error('boom'))
      const testRoute = createBffRoute({ technology: Technologies.Angular })

      await routerService.init([testRoute])
      const createdRoute = router.config.find((r) => r.path === 'admin/welcome')

      await expect(createdRoute?.loadChildren?.()).rejects.toThrow('boom')
      expect(mockPortalMessageService.error).toHaveBeenCalledWith({
        summaryKey: 'ERROR_MESSAGES.ON_REMOTE_LOAD_ERROR'
      })
      expect(navigateSpy).toHaveBeenCalledWith([
        'remote-loading-error-page',
        { requestedApplicationPath: '/failing-app' }
      ])
    })

    it('covers direct helper logic', async () => {
      const serviceAsAny = routerService as any
      routerService.showContent$.next(false)
      emitNavigationEnd()

      expect(serviceAsAny.listRoutes([createBffRoute({ url: '/u', baseUrl: '/b' })])).toContain('/u')
      expect(serviceAsAny.sortRoutes({ url: '/short' }, { url: '/very/long/url' })).toBeGreaterThan(0)
      expect(await serviceAsAny.toRouteUrl(undefined)).toBeUndefined()
      expect(routerService.showContent$.getValue()).toBe(true)
    })

    it('covers remaining branch-only paths', async () => {
      const serviceAsAny = routerService as any

      routerService.showContent$.next(false)
      emitRouterEvent({})
      expect(routerService.showContent$.getValue()).toBe(false)

      emitRouterEvent(Object.create(NavigationSkipped.prototype))
      expect(routerService.showContent$.getValue()).toBe(true)

      expect(serviceAsAny.sortRoutes({ url: undefined }, { url: '/a' })).toBe(2)
      expect(serviceAsAny.sortRoutes({ url: undefined }, { url: undefined })).toBe(0)
      ;(mockConfigurationService.getProperty as jest.Mock).mockResolvedValue('')
      expect(await serviceAsAny.toRouteUrl('admin/plain')).toBe('admin/plain')
      ;(mockConfigurationService.getProperty as jest.Mock).mockResolvedValue('/portal')
      expect(await serviceAsAny.toRouteUrl('/admin/plain')).toBe('admin/plain')

      const routeWithoutDot = createBffRoute({
        technology: Technologies.Angular,
        exposedModule: 'OneCXWelcomeModule'
      })
      loadRemoteMock.mockResolvedValue({ OneCXWelcomeModule: { moduleName: 'NoDotModule' } })
      await routerService.init([routeWithoutDot])
      const createdRoute = router.config.find((r) => r.path === 'admin/welcome')
      const loaded = await createdRoute?.loadChildren?.()
      expect(loaded).toEqual({ moduleName: 'NoDotModule' })

      const secondRoute = createBffRoute({
        appId: 'onecx-second-ui',
        productName: 'onecx-second',
        url: '/mfe/second/',
        baseUrl: '/admin/second/',
        displayName: 'OneCX Second'
      })
      await routerService.init([routeWithoutDot, secondRoute])
      const firstCreated = router.config.find((r) => r.path === 'admin/welcome')
      const secondCreated = router.config.find((r) => r.path === 'admin/second')
      const firstActivate = firstCreated?.canActivateChild?.[0] as () => Promise<boolean>
      const secondActivate = secondCreated?.canActivateChild?.[0] as () => Promise<boolean>

      await firstActivate()
      const permissionsCallsAfterFirst = (mockPermissionsCacheService.getPermissions as jest.Mock).mock.calls.length
      await secondActivate()
      const permissionsCallsAfterSecond = (mockPermissionsCacheService.getPermissions as jest.Mock).mock.calls.length
      expect(permissionsCallsAfterSecond).toBeGreaterThan(permissionsCallsAfterFirst)

      serviceAsAny.isFirstLoad = false
      await appStateServiceMock.currentMfe$.publish(undefined as any)
      await expect(serviceAsAny.updateAppState(routeWithoutDot, routeWithoutDot.baseUrl)).resolves.toBe(true)
    })
  })
})
