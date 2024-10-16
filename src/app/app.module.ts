import { APP_INITIALIZER, NgModule } from '@angular/core'
import { HttpClient, HttpClientModule } from '@angular/common/http'
import { BrowserModule } from '@angular/platform-browser'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { Router, RouterModule } from '@angular/router'
import { MissingTranslationHandler, TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { NavigatedEventPayload } from '@onecx/integration-interface'
import { getLocation } from '@onecx/accelerator'
import {
  AngularAcceleratorMissingTranslationHandler,
  CachingTranslateLoader,
  TranslateCombinedLoader,
  TranslationCacheService
} from '@onecx/angular-accelerator'
import { AngularAuthModule } from '@onecx/angular-auth'
import {
  APP_CONFIG,
  AppStateService,
  ConfigurationService,
  RemoteComponentsService,
  ThemeService,
  UserService
} from '@onecx/angular-integration-interface'
import { AngularRemoteComponentsModule, SLOT_SERVICE, SlotService } from '@onecx/angular-remote-components'
import { DEFAULT_LANG, PortalCoreModule } from '@onecx/portal-integration-angular'
import { SHOW_CONTENT_PROVIDER, ShellCoreModule } from '@onecx/shell-core'
import { EventsPublisher, EventsTopic } from '@onecx/integration-interface'

import { catchError, filter, firstValueFrom, retry } from 'rxjs'
import { environment } from 'src/environments/environment'
import {
  BASE_PATH,
  LoadWorkspaceConfigResponse,
  UserProfileBffService,
  WorkspaceConfigBffService
} from 'src/app/shared/generated'

import { ErrorPageComponent } from './shell/components/error-page.component'
import { HomeComponent } from './shell/components/home/home.component'
import { InitializationErrorPageComponent } from './shell/components/initialization-error-page/initialization-error-page.component'
import { PermissionProxyService } from './shell/services/permission-proxy.service'
import { RoutesService } from './shell/services/routes.service'
import { initializationErrorHandler } from './shell/utils/initialization-error-handler.utils'

import { AppComponent } from './app.component'
import { appRoutes } from './app.routes'

export function createTranslateLoader(http: HttpClient, translationCacheService: TranslationCacheService) {
  return new TranslateCombinedLoader(
    new CachingTranslateLoader(translationCacheService, http, `./assets/i18n/`, '.json'),
    new CachingTranslateLoader(translationCacheService, http, `./onecx-portal-lib/assets/i18n/`, '.json')
  )
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

export function workspaceConfigInitializer(
  workspaceConfigBffService: WorkspaceConfigBffService,
  routesService: RoutesService,
  themeService: ThemeService,
  appStateService: AppStateService,
  remoteComponentsService: RemoteComponentsService,
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

let history: string[] = []
let isInitialPageLoad = true
const pushState = window.history.pushState
window.history.pushState = (data: any, unused: string, url?: string) => {
  pushState.bind(window.history)(data, unused, url)
  new EventsPublisher().publish({
    type: 'navigated',
    payload: {
      url,
      isFirst: history.length === 0,
      history
    } satisfies NavigatedEventPayload
  })
  if (!isInitialPageLoad) {
    history.push(url ?? '')
    history = history.slice(-100)
  }
  isInitialPageLoad = false
}

const replaceState = window.history.replaceState
window.history.replaceState = (data: any, unused: string, url?: string) => {
  replaceState.bind(window.history)(data, unused, url)
  new EventsPublisher().publish({
    type: 'navigated',
    payload: {
      url,
      isFirst: history.length === 0,
      history
    } satisfies NavigatedEventPayload
  })
  if (!isInitialPageLoad) {
    if (history.length === 0) {
      history.push(url ?? '')
    } else {
      const lastIndex = history.length - 1
      history[lastIndex] = url ?? ''
    }
  }
  isInitialPageLoad = false
}

export function urlChangeListenerInitializer(router: Router, appStateService: AppStateService) {
  return async () => {
    await appStateService.isAuthenticated$.isInitialized
    let lastUrl = ''
    let isFirstRoute = true
    const observer = new EventsTopic()
    observer.pipe(filter((e) => e.type === 'navigated')).subscribe(() => {
      const routerUrl = `${location.pathname.substring(
        getLocation().deploymentPath.length
      )}${location.search}${location.hash}`
      if (routerUrl !== lastUrl) {
        lastUrl = routerUrl
        if (!isFirstRoute) {
          router.navigateByUrl(routerUrl)
        } else {
          isFirstRoute = false
        }
      }
    })
  }
}

@NgModule({
  declarations: [AppComponent, ErrorPageComponent, HomeComponent, InitializationErrorPageComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    RouterModule.forRoot(appRoutes),
    HttpClientModule,
    TranslateModule.forRoot({
      isolate: true,
      defaultLanguage: DEFAULT_LANG,
      loader: {
        provide: TranslateLoader,
        useFactory: createTranslateLoader,
        deps: [HttpClient, TranslationCacheService]
      },
      missingTranslationHandler: {
        provide: MissingTranslationHandler,
        useClass: AngularAcceleratorMissingTranslationHandler
      }
    }),
    ShellCoreModule,
    PortalCoreModule.forRoot('shell', true),
    AngularRemoteComponentsModule,
    AngularAuthModule
  ],
  providers: [
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
      deps: [WorkspaceConfigBffService, RoutesService, ThemeService, AppStateService, RemoteComponentsService, Router],
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
    { provide: SLOT_SERVICE, useExisting: SlotService },
    { provide: BASE_PATH, useValue: './shell-bff' },
    { provide: SHOW_CONTENT_PROVIDER, useExisting: RoutesService }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
