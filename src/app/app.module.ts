import { HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http'
import { inject, NgModule, provideAppInitializer } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { Router, RouterModule } from '@angular/router'
import { MissingTranslationHandler, TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { getLocation, getNormalizedBrowserLocales, normalizeLocales } from '@onecx/accelerator'
import { provideAuthService, provideTokenInterceptor } from '@onecx/angular-auth'
import {
  APP_CONFIG,
  AppStateService,
  CONFIG_KEY,
  ConfigurationService,
  POLYFILL_SCOPE_MODE,
  RemoteComponentsService,
  ThemeService,
  UserService
} from '@onecx/angular-integration-interface'
import { SLOT_SERVICE, SlotService } from '@onecx/angular-remote-components'
import { catchError, filter, firstValueFrom, retry } from 'rxjs'

import { createTranslateLoader, MultiLanguageMissingTranslationHandler, provideTranslationPathFromMeta, SKIP_STYLE_SCOPING } from '@onecx/angular-utils'
import { provideThemeConfig } from '@onecx/angular-utils/theme/primeng'

import {
  CurrentLocationPublisher,
  EventsPublisher,
  EventsTopic,
  NavigatedEventPayload,
  Theme,
  UserProfile
} from '@onecx/integration-interface'

import {
  BASE_PATH,
  LoadWorkspaceConfigResponse,
  UserProfileBffService,
  WorkspaceConfigBffService
} from 'src/app/shared/generated'
import { environment } from 'src/environments/environment'

import { PermissionProxyService } from './shell/services/permission-proxy.service'
import { RoutesService } from './shell/services/routes.service'
import { initializationErrorHandler } from './shell/utils/initialization-error-handler.utils'

import { CommonModule } from '@angular/common'
import { providePrimeNG } from 'primeng/config'
import { AppComponent } from './app.component'
import { appRoutes } from './app.routes'
import { AppLoadingSpinnerComponent } from './shell/components/app-loading-spinner/app-loading-spinner.component'
import { GlobalErrorComponent } from './shell/components/error-component/global-error.component'
import { PortalViewportComponent } from './shell/components/portal-viewport/portal-viewport.component'
import { ParametersService } from './shell/services/parameters.service'
import { mapSlots } from './shell/utils/slot-names-mapper'

async function styleInitializer(configService: ConfigurationService, http: HttpClient) {
  const mode = await configService.getProperty(CONFIG_KEY.POLYFILL_SCOPE_MODE)
  if (mode === POLYFILL_SCOPE_MODE.PRECISION) {
    const { applyPrecisionPolyfill } = await import('src/scope-polyfill/polyfill')
    applyPrecisionPolyfill()
  } else {
    const { applyPerformancePolyfill } = await import('src/scope-polyfill/polyfill')
    applyPerformancePolyfill()
  }

  await Promise.all([
    import('./shell/utils/styles/shell-styles.utils').then(async ({ fetchShellStyles, loadShellStyles }) => {
      const css = await fetchShellStyles(http)
      loadShellStyles(css)
    }),
    import('./shell/utils/styles/legacy-style.utils').then(async ({ fetchPortalLayoutStyles, loadPortalLayoutStyles }) => {
      const css = await fetchPortalLayoutStyles(http)
      loadPortalLayoutStyles(css)
    })])
}

function publishCurrentWorkspace(
  appStateService: AppStateService,
  loadWorkspaceConfigResponse: LoadWorkspaceConfigResponse
) {
  return appStateService.currentWorkspace$.publish({
    baseUrl: loadWorkspaceConfigResponse.workspace.baseUrl,
    portalName: loadWorkspaceConfigResponse.workspace.name,
    workspaceName: loadWorkspaceConfigResponse.workspace.name,
    routes: loadWorkspaceConfigResponse.routes,
    homePage: loadWorkspaceConfigResponse.workspace.homePage,
    microfrontendRegistrations: [],
    displayName: loadWorkspaceConfigResponse.workspace.displayName
  })
}

export async function workspaceConfigInitializer(
  workspaceConfigBffService: WorkspaceConfigBffService,
  routesService: RoutesService,
  themeService: ThemeService,
  appStateService: AppStateService,
  remoteComponentsService: RemoteComponentsService,
  parametersService: ParametersService,
  router: Router
) {
  await appStateService.isAuthenticated$.isInitialized

  const loadWorkspaceConfigResponse = await firstValueFrom(
    workspaceConfigBffService
      .loadWorkspaceConfig({
        path: getLocation().applicationPath
      })
      .pipe(
        retry({ delay: 500, count: 3 }),
        catchError((error) => initializationErrorHandler(error, router))
      )
  )

  if (loadWorkspaceConfigResponse) {
    const parsedProperties = JSON.parse(loadWorkspaceConfigResponse.theme.properties) as Record<
      string,
      Record<string, string>
    >
    const themeWithParsedProperties = {
      ...loadWorkspaceConfigResponse.theme,
      properties: parsedProperties
    }

    await Promise.all([
      publishCurrentWorkspace(appStateService, loadWorkspaceConfigResponse),
      routesService
        .init(loadWorkspaceConfigResponse.routes)
        .then(urlChangeListenerInitializer(router, appStateService)),
      apply(themeService, themeWithParsedProperties),
      remoteComponentsService.remoteComponents$.publish({
        components: loadWorkspaceConfigResponse.components,
        slots: mapSlots(loadWorkspaceConfigResponse.slots)
      })
    ])
    parametersService.initialize()
  }
}

export async function userProfileInitializer(
  userProfileBffService: UserProfileBffService,
  userService: UserService,
  appStateService: AppStateService,
  router: Router
) {
  await appStateService.isAuthenticated$.isInitialized
  const getUserProfileResponse = await firstValueFrom(
    userProfileBffService.getUserProfile().pipe(
      retry({ delay: 500, count: 3 }),
      catchError((error) => {
        return initializationErrorHandler(error, router)
      })
    )
  )

  if (getUserProfileResponse) {
    console.log('ORGANIZATION : ', getUserProfileResponse.userProfile.organization)

    const profile: UserProfile = { ...getUserProfileResponse.userProfile }
    profile.settings ??= {}
    profile.settings.locales ? normalizeLocales(profile.settings.locales) : getNormalizedBrowserLocales()

    await userService.profile$.publish(getUserProfileResponse.userProfile)
  }
}

export function slotInitializer(slotService: SlotService) {
  slotService.init()
}

export function permissionProxyInitializer(permissionProxyService: PermissionProxyService) {
  permissionProxyService.init()
}

export function configurationServiceInitializer(configurationService: ConfigurationService) {
  configurationService.init()
}

let isFirst = true
let isInitialPageLoad = true
const pushState = globalThis.history.pushState
globalThis.history.pushState = (data: any, unused: string, url?: string) => {
  const isRouterSync = data?.isRouterSync
  if (data && 'isRouterSync' in data) {
    delete data.isRouterSync
  }
  if (data.navigationId !== 'undefined' && data.navigationId === -1) {
    console.warn('Navigation ID is -1, indicating a potential invalid microfrontend initialization.')
    return
  }
  pushState.bind(globalThis.history)(data, unused, url)
  if (!isRouterSync) {
    new CurrentLocationPublisher().publish({
      url,
      isFirst: false
    })
  }
  new EventsPublisher().publish({
    type: 'navigated',
    payload: {
      url,
      isFirst
    } satisfies NavigatedEventPayload
  })

  if (!isInitialPageLoad) {
    isFirst = false
  }
  isInitialPageLoad = false
}

const replaceState = globalThis.history.replaceState
globalThis.history.replaceState = (data: any, unused: string, url?: string) => {
  const isRouterSync = data?.isRouterSync
  let preventLocationPropagation = false
  if (data && 'isRouterSync' in data) {
    delete data.isRouterSync
  }
  if (data?.navigationId !== 'undefined' && data?.navigationId === -1) {
    console.warn('Navigation ID is -1, indicating a potential invalid microfrontend initialization.')
    return
  }
  // Edge Case Handling: React Router initialization with a replaceState call
  if (checkIfReactRouterInitialization(data, url)) {
    const _url = _constructCurrentURL()
    // Use current URL (instead of undefined) but keep data from react-router
    replaceState.bind(globalThis.history)(data, '', _url)
    preventLocationPropagation = true
  }

  if (!preventLocationPropagation) replaceState.bind(window.history)(data, unused, url) // NOSONAR

  if (!isRouterSync && !preventLocationPropagation) {
    new CurrentLocationPublisher().publish({
      url,
      isFirst: false
    })
  }
  new EventsPublisher().publish({
    type: 'navigated',
    payload: {
      url,
      isFirst: isFirst
    } satisfies NavigatedEventPayload
  })

  if (!isInitialPageLoad) {
    isFirst = false
  }
  isInitialPageLoad = false
}

/**
 * Checks if the replaceState call is from react-router initialization
 * @param data
 * @param url
 * @returns whether the location propagation should be prevented
 */
function checkIfReactRouterInitialization(data: any, url?: string) {
  if (data && 'idx' in data && data.idx === 0 && url === undefined) {
    return true
  }
  return false
}

/**
 * Constructs the current URL relative to the deployment path
 * @returns the current URL
 */
function _constructCurrentURL() {
  return `${location.pathname.substring(getLocation().deploymentPath.length)}${location.search}${location.hash}`
}

export function urlChangeListenerInitializer(router: Router, appStateService: AppStateService) {
  return async () => {
    await appStateService.isAuthenticated$.isInitialized
    let lastUrl = ''
    let isFirstRoute = true
    const url = _constructCurrentURL()
    new CurrentLocationPublisher().publish({
      url,
      isFirst: true
    })
    appStateService.currentLocation$.subscribe(() => {
      const routerUrl = `${location.pathname.substring(
        getLocation().deploymentPath.length
      )}${location.search}${location.hash}`
      if (routerUrl !== lastUrl) {
        lastUrl = routerUrl
        if (isFirstRoute) {
          isFirstRoute = false
        } else {
          router.navigateByUrl(routerUrl, {
            replaceUrl: true,
            state: { isRouterSync: true }
          })
        }
      }
    })

    const eventsTopic = new EventsTopic()
    eventsTopic.pipe(filter((event) => event.type === 'revertNavigation')).subscribe((event) => {
      if (globalThis.history.length > 1) {
        globalThis.history.back()
      } else {
        console.log('No previous route in history.')
      }
    })
  }
}

async function apply(themeService: ThemeService, theme: Theme): Promise<void> {
  console.log(`🎨 Applying theme: ${theme.name}`)
  await themeService.currentTheme$.publish(theme)
  if (theme.properties) {
    for (const group of Object.values(theme.properties)) {
      for (const [key, value] of Object.entries(group)) {
        document.documentElement.style.setProperty(`--${key}`, value)
      }
    }
  }
}

declare const __webpack_share_scopes__: any

declare global {
  interface Window {
    onecxWebpackContainer: any
  }
}

export async function shareMfContainer() {
  window.onecxWebpackContainer = __webpack_share_scopes__ // NOSONAR
}

@NgModule({
  declarations: [
    AppComponent,

  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    CommonModule,
    RouterModule.forRoot(appRoutes),
    TranslateModule.forRoot({
      isolate: true,
      defaultLanguage: 'en',
      loader: {
        provide: TranslateLoader,
        useFactory: createTranslateLoader,
        deps: [HttpClient]
      },
      missingTranslationHandler: {
        provide: MissingTranslationHandler,
        useClass: MultiLanguageMissingTranslationHandler
      }
    }),

    PortalViewportComponent,
    GlobalErrorComponent,
    AppLoadingSpinnerComponent
  ],
  providers: [
    provideAppInitializer(() => {
      return workspaceConfigInitializer(
        inject(WorkspaceConfigBffService),
        inject(RoutesService),
        inject(ThemeService),
        inject(AppStateService),
        inject(RemoteComponentsService),
        inject(ParametersService),
        inject(Router)
      )
    }),
    provideThemeConfig(),
    provideTokenInterceptor(),
    provideHttpClient(withInterceptorsFromDi()),
    provideAuthService(),
    providePrimeNG(),
    {
      provide: SKIP_STYLE_SCOPING,
      useValue: true
    },
    provideTranslationPathFromMeta(import.meta.url, 'assets/i18n/'),
    { provide: APP_CONFIG, useValue: environment },
    provideAppInitializer(() => {
      permissionProxyInitializer(inject(PermissionProxyService))
    }),
    provideAppInitializer(() => {
      return configurationServiceInitializer(inject(ConfigurationService))
    }),
    provideAppInitializer(() => {
      // Load dynamic content initializer lazily to avoid static import
      const configService = inject(ConfigurationService)
      return import('./shell/utils/styles/dynamic-content-initializer.utils').then(({ dynamicContentInitializer }) =>
        dynamicContentInitializer(configService)
      )
    }),
    provideAppInitializer(() => {
      return userProfileInitializer(
        inject(UserProfileBffService),
        inject(UserService),
        inject(AppStateService),
        inject(Router)
      )
    }),
    provideAppInitializer(() => {
      return slotInitializer(inject(SLOT_SERVICE))
    }),
    provideAppInitializer(() => {
      return styleInitializer(inject(ConfigurationService), inject(HttpClient))
    }),
    provideAppInitializer(() => {
      return shareMfContainer()
    }),
    provideAppInitializer(() => {
      // Lazily initialize style changes listener
      return import('./shell/utils/styles/style-changes-listener.utils').then(({ styleChangesListenerInitializer }) =>
        styleChangesListenerInitializer()
      )
    }),
    { provide: SLOT_SERVICE, useExisting: SlotService },
    { provide: BASE_PATH, useValue: './shell-bff' }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
