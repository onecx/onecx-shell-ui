import { APP_INITIALIZER, NgModule } from '@angular/core'
import { HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http'
import { BrowserModule } from '@angular/platform-browser'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { Router, RouterModule } from '@angular/router'
import { MissingTranslationHandler, TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { catchError, firstValueFrom, retry } from 'rxjs'

import { getLocation } from '@onecx/accelerator'
import { AngularAcceleratorMissingTranslationHandler } from '@onecx/angular-accelerator'
import { provideAuthService, provideTokenInterceptor } from '@onecx/angular-auth'
import {
  APP_CONFIG,
  AppStateService,
  ConfigurationService,
  RemoteComponentsService,
  ThemeService,
  UserService
} from '@onecx/angular-integration-interface'
import { AngularRemoteComponentsModule, SLOT_SERVICE, SlotService } from '@onecx/angular-remote-components'
import { createTranslateLoader, TRANSLATION_PATH } from '@onecx/angular-utils'
import { DEFAULT_LANG, PortalCoreModule } from '@onecx/portal-integration-angular'
import { ShellCoreModule, SHOW_CONTENT_PROVIDER, WORKSPACE_CONFIG_BFF_SERVICE_PROVIDER } from '@onecx/shell-core'
import { CurrentLocationPublisher, EventsPublisher, NavigatedEventPayload } from '@onecx/integration-interface'

import {
  BASE_PATH,
  LoadWorkspaceConfigResponse,
  UserProfileBffService,
  WorkspaceConfigBffService
} from 'src/app/shared/generated'
import { environment } from 'src/environments/environment'

import { HomeComponent } from './shell/components/home/home.component'
import { InitializationErrorPageComponent } from './shell/components/initialization-error-page/initialization-error-page.component'
import { PageNotFoundComponent } from './shell/components/not-found-page.component'
import { ErrorPageComponent } from './shell/components/error-page.component'
import { WelcomeMessageComponent } from './shell/components/welcome-message-component/welcome-message.component'

import { ParametersService } from './shell/services/parameters.service'
import { PermissionProxyService } from './shell/services/permission-proxy.service'
import { RoutesService } from './shell/services/routes.service'
import { initializationErrorHandler } from './shell/utils/initialization-error-handler.utils'

import { AppComponent } from './app.component'
import { appRoutes } from './app.routes'

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

export function workspaceConfigInitializer(
  workspaceConfigBffService: WorkspaceConfigBffService,
  routesService: RoutesService,
  themeService: ThemeService,
  appStateService: AppStateService,
  remoteComponentsService: RemoteComponentsService,
  parametersService: ParametersService,
  router: Router
) {
  return async () => {
    await appStateService.isAuthenticated$.isInitialized
    const loadWorkspaceConfigResponse = await firstValueFrom(
      workspaceConfigBffService
        .loadWorkspaceConfig({
          path: getLocation().applicationPath
        })
        .pipe(
          retry({ delay: 500, count: 3 }),
          catchError((error) => {
            return initializationErrorHandler(error, router)
          })
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
        themeService.apply(themeWithParsedProperties),
        remoteComponentsService.remoteComponents$.publish({
          components: loadWorkspaceConfigResponse.components,
          slots: loadWorkspaceConfigResponse.slots
        })
      ])
      parametersService.initialize()
    }
  }
}

export function userProfileInitializer(
  userProfileBffService: UserProfileBffService,
  userService: UserService,
  appStateService: AppStateService,
  router: Router
) {
  return async () => {
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

      await userService.profile$.publish(getUserProfileResponse.userProfile)
    }
  }
}

export function slotInitializer(slotService: SlotService) {
  return () => slotService.init()
}

export function permissionProxyInitializer(permissionProxyService: PermissionProxyService) {
  return () => permissionProxyService.init()
}

export function configurationServiceInitializer(configurationService: ConfigurationService) {
  return () => configurationService.init()
}

let isFirst = true
let isInitialPageLoad = true
const pushState = window.history.pushState
window.history.pushState = (data: any, unused: string, url?: string) => {
  const isRouterSync = data?.isRouterSync
  if (data && 'isRouterSync' in data) {
    delete data.isRouterSync
  }
  pushState.bind(window.history)(data, unused, url)
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

const replaceState = window.history.replaceState
window.history.replaceState = (data: any, unused: string, url?: string) => {
  const isRouterSync = data?.isRouterSync
  if (data && 'isRouterSync' in data) {
    delete data.isRouterSync
  }
  replaceState.bind(window.history)(data, unused, url)
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
      isFirst: isFirst
    } satisfies NavigatedEventPayload
  })

  if (!isInitialPageLoad) {
    isFirst = false
  }
  isInitialPageLoad = false
}

export function urlChangeListenerInitializer(router: Router, appStateService: AppStateService) {
  return async () => {
    await appStateService.isAuthenticated$.isInitialized
    let lastUrl = ''
    let isFirstRoute = true
    const url = `${location.pathname.substring(getLocation().deploymentPath.length)}${location.search}${location.hash}`
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
        if (!isFirstRoute) {
          router.navigateByUrl(routerUrl, {
            replaceUrl: true,
            state: { isRouterSync: true }
          })
        } else {
          isFirstRoute = false
        }
      }
    })
  }
}

declare const __webpack_share_scopes__: { default: unknown }

declare global {
  interface Window {
    onecxWebpackContainer: any
  }
}

export function shareMfContainer() {
  return async () => {
    window.onecxWebpackContainer = __webpack_share_scopes__.default
  }
}

@NgModule({
  declarations: [
    AppComponent,
    PageNotFoundComponent,
    ErrorPageComponent,
    HomeComponent,
    WelcomeMessageComponent,
    InitializationErrorPageComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    RouterModule.forRoot(appRoutes),
    TranslateModule.forRoot({
      isolate: true,
      defaultLanguage: DEFAULT_LANG,
      loader: {
        provide: TranslateLoader,
        useFactory: createTranslateLoader,
        deps: [HttpClient]
      },
      missingTranslationHandler: {
        provide: MissingTranslationHandler,
        useClass: AngularAcceleratorMissingTranslationHandler
      }
    }),
    ShellCoreModule,
    PortalCoreModule.forRoot('shell', true),
    AngularRemoteComponentsModule
  ],
  providers: [
    provideTokenInterceptor(),
    provideHttpClient(withInterceptorsFromDi()),
    provideAuthService(),
    {
      provide: TRANSLATION_PATH,
      useValue: './assets/i18n/',
      multi: true
    },
    { provide: APP_CONFIG, useValue: environment },
    {
      provide: APP_INITIALIZER,
      useFactory: permissionProxyInitializer,
      deps: [PermissionProxyService],
      multi: true
    },
    {
      provide: APP_INITIALIZER,
      useFactory: workspaceConfigInitializer,
      deps: [
        WorkspaceConfigBffService,
        RoutesService,
        ThemeService,
        AppStateService,
        RemoteComponentsService,
        ParametersService,
        Router
      ],
      multi: true
    },
    {
      provide: APP_INITIALIZER,
      useFactory: userProfileInitializer,
      deps: [UserProfileBffService, UserService, AppStateService, Router],
      multi: true
    },
    {
      provide: APP_INITIALIZER,
      useFactory: slotInitializer,
      deps: [SLOT_SERVICE],
      multi: true
    },
    {
      provide: APP_INITIALIZER,
      useFactory: configurationServiceInitializer,
      deps: [ConfigurationService],
      multi: true
    },
    {
      provide: APP_INITIALIZER,
      useFactory: shareMfContainer,
      multi: true
    },
    { provide: SLOT_SERVICE, useExisting: SlotService },
    { provide: BASE_PATH, useValue: './shell-bff' },
    { provide: SHOW_CONTENT_PROVIDER, useExisting: RoutesService },
    { provide: WORKSPACE_CONFIG_BFF_SERVICE_PROVIDER, useExisting: WorkspaceConfigBffService }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
