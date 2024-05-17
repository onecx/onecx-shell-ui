import { HttpClient, HttpClientModule } from '@angular/common/http';
import { APP_INITIALIZER, ErrorHandler, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Router, RouterModule } from '@angular/router';
import {
  MissingTranslationHandler,
  TranslateLoader,
  TranslateModule,
} from '@ngx-translate/core';
import { getLocation } from '@onecx/accelerator';
import {
  AngularAcceleratorMissingTranslationHandler,
  CachingTranslateLoader,
  TranslateCombinedLoader,
  TranslationCacheService,
} from '@onecx/angular-accelerator';
import {
  APP_CONFIG,
  AppStateService,
  ConfigurationService,
  RemoteComponentsService,
  ThemeService,
  UserService,
} from '@onecx/angular-integration-interface';
import {
  AngularRemoteComponentsModule,
  SLOT_SERVICE,
  SlotService,
} from '@onecx/angular-remote-components';
import { KeycloakAuthModule } from '@onecx/keycloak-auth';
import {
  DEFAULT_LANG,
  PortalCoreModule,
} from '@onecx/portal-integration-angular';
import { SHOW_CONTENT_PROVIDER, ShellCoreModule } from '@onecx/shell-core';
import { catchError, firstValueFrom, retry } from 'rxjs';
import { environment } from '../environments/environment';
import { AppComponent } from './app.component';
import { appRoutes } from './app.routes';
import { ErrorPageComponent } from './shell/components/error-page.component';
import { HomeComponent } from './shell/components/home/home.component';
import { InitializationErrorPageComponent } from './shell/components/initialization-error-page/initialization-error-page.component';
import {
  BASE_PATH,
  LoadWorkspaceConfigResponse,
  Slot,
  UserProfileBffService,
  WorkspaceConfigBffService,
} from './shell/generated';
import { RoutesService } from './shell/services/routes.service';
import { initializationErrorHandler } from './shell/utils/initialization-error-handler.utils';
import { PermissionProxyService } from './shell/services/permission-proxy.service';

export function createTranslateLoader(
  http: HttpClient,
  translationCacheService: TranslationCacheService
) {
  return new TranslateCombinedLoader(
    new CachingTranslateLoader(
      translationCacheService,
      http,
      `./assets/i18n/`,
      '.json'
    ),
    new CachingTranslateLoader(
      translationCacheService,
      http,
      `./onecx-portal-lib/assets/i18n/`,
      '.json'
    )
  );
}

function publishCurrentWorkspace(
  appStateService: AppStateService,
  loadWorkspaceConfigResponse: LoadWorkspaceConfigResponse
) {
  return appStateService.currentWorkspace$.publish({
    baseUrl: loadWorkspaceConfigResponse.workspace.baseUrl,
    portalName: loadWorkspaceConfigResponse.workspace.name,
    workspaceName: loadWorkspaceConfigResponse.workspace.name,
    microfrontendRegistrations: [],
  });
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
    await appStateService.isAuthenticated$.isInitialized;
    const loadWorkspaceConfigResponse = await firstValueFrom(
      workspaceConfigBffService
        .loadWorkspaceConfig({
          path: getLocation().applicationPath,
        })
        .pipe(
          retry({ delay: 500, count: 3 }),
          catchError((error) => {
            return initializationErrorHandler(error, router);
          })
        )
    );

    if (loadWorkspaceConfigResponse) {
      // loadWorkspaceConfigResponse.routes.push({
      //   url: 'http://localhost:5025/',
      //   baseUrl: '/admin/test',
      //   remoteEntryUrl:
      //     'https://nice-grass-018f7d910.azurestaticapps.net/remoteEntry.js',
      //   appId: 'onecx-workspace-ui',
      //   productName: 'angular1',
      //   technology: 'WebComponent',
      //   exposedModule: './web-components',
      //   pathMatch: 'prefix',
      //   remoteName: 'angular1-element',
      //   displayName: 'OneCX Workspace',
      //   endpoints: [],
      // });
        loadWorkspaceConfigResponse.routes.push(        {
          "url": "http://localhost:4200/",
          "baseUrl": "/admin/test",
          "remoteEntryUrl": "http://localhost:4200/remoteEntry.js",
          "appId": "onecxAnnouncementUi",
          "productName": "onecxAnnouncementUi",
          "technology": "WebComponent",
          "exposedModule": "./ocxAnnouncementApp",
          "pathMatch": "prefix",
          "remoteName": "ocx-announcement-app",
          "displayName": "OneCX Announcement",
          "endpoints": []
      });
      // loadWorkspaceConfigResponse.components.push({
      //     "name": "test",
      //     "baseUrl": "http://localhost:4201/",
      //     "remoteEntryUrl": "http://localhost:4201/remoteEntry.js",
      //     "appId": "onecx-announcement-ui",
      //     "productName": "onecx-announcement",
      //     "exposedModule": "./ocx-announcement-banner",
      //     "remoteName": "ocx-announcement-banner",
      //     "technology": "WebComponent"
      // });
      loadWorkspaceConfigResponse.slots
        .find((s: Slot) => s.name === 'subHeader')
        ?.components.push('test');
      loadWorkspaceConfigResponse.slots = [];
      const parsedProperties = JSON.parse(
        loadWorkspaceConfigResponse.theme.properties
      ) as Record<string, Record<string, string>>;
      const themeWithParsedProperties = {
        ...loadWorkspaceConfigResponse.theme,
        properties: parsedProperties,
      };

      await Promise.all([
        publishCurrentWorkspace(appStateService, loadWorkspaceConfigResponse),
        routesService.init(loadWorkspaceConfigResponse.routes),
        themeService.apply(themeWithParsedProperties),
        remoteComponentsService.remoteComponents$.publish({
          components: loadWorkspaceConfigResponse.components,
          slots: loadWorkspaceConfigResponse.slots,
        }),
      ]);
    }
  };
}

export function userProfileInitializer(
  userProfileBffService: UserProfileBffService,
  userService: UserService,
  appStateService: AppStateService,
  router: Router
) {
  return async () => {
    await appStateService.isAuthenticated$.isInitialized;
    const getUserProfileResponse = await firstValueFrom(
      userProfileBffService.getUserProfile().pipe(
        retry({ delay: 500, count: 3 }),
        catchError((error) => {
          return initializationErrorHandler(error, router);
        })
      )
    );

    if (getUserProfileResponse) {
      console.log(
        'ORGANIZATION : ',
        getUserProfileResponse.userProfile.organization
      );

      await userService.profile$.publish(getUserProfileResponse.userProfile);
    }
  };
}

export function slotInitializer(slotService: SlotService) {
  return () => slotService.init();
}

export function permissionProxyInitializer(
  permissionProxyService: PermissionProxyService
) {
  return () => permissionProxyService.init();
}

export function configurationServiceInitializer(
  configurationService: ConfigurationService
) {
  return () => configurationService.init();
}

class MyErrorHandler implements ErrorHandler {
  handleError(error: any) {
    // do something with the exception
  }
}

@NgModule({
  declarations: [
    AppComponent,
    ErrorPageComponent,
    HomeComponent,
    InitializationErrorPageComponent,
  ],
  imports: [
    BrowserModule,
    RouterModule.forRoot(appRoutes),
    HttpClientModule,
    TranslateModule.forRoot({
      isolate: true,
      defaultLanguage: DEFAULT_LANG,
      loader: {
        provide: TranslateLoader,
        useFactory: createTranslateLoader,
        deps: [HttpClient, TranslationCacheService],
      },
      missingTranslationHandler: {
        provide: MissingTranslationHandler,
        useClass: AngularAcceleratorMissingTranslationHandler,
      },
    }),
    ShellCoreModule,
    PortalCoreModule.forRoot('shell', true),
    AngularRemoteComponentsModule,
    RouterModule,
    KeycloakAuthModule,
  ],
  providers: [
    {provide: ErrorHandler, useClass: MyErrorHandler},
    { provide: APP_CONFIG, useValue: environment },
    {
      provide: APP_INITIALIZER,
      useFactory: permissionProxyInitializer,
      deps: [PermissionProxyService],
      multi: true,
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
        Router,
      ],
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: userProfileInitializer,
      deps: [UserProfileBffService, UserService, AppStateService, Router],
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: slotInitializer,
      deps: [SLOT_SERVICE],
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: configurationServiceInitializer,
      deps: [ConfigurationService],
      multi: true,
    },
    {
      provide: SLOT_SERVICE,
      useExisting: SlotService,
    },
    {
      provide: BASE_PATH,
      useValue: './shell-bff',
    },
    {
      provide: SHOW_CONTENT_PROVIDER,
      useExisting: RoutesService,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
