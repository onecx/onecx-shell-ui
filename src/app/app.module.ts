import { HttpClient, HttpClientModule } from '@angular/common/http';
import { APP_INITIALIZER, ErrorHandler, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
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
import { Slot } from '@onecx/integration-interface';
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
import {
  BASE_PATH,
  LoadWorkspaceConfigResponse,
  UserProfileBffService,
  WorkspaceConfigBffService,
} from './shared/generated';
import { ErrorPageComponent } from './shell/components/error-page.component';
import { HomeComponent } from './shell/components/home/home.component';
import { InitializationErrorPageComponent } from './shell/components/initialization-error-page/initialization-error-page.component';
import { PermissionProxyService } from './shell/services/permission-proxy.service';
import { RoutesService } from './shell/services/routes.service';
import { initializationErrorHandler } from './shell/utils/initialization-error-handler.utils';

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

      loadWorkspaceConfigResponse.components.push({
        name: 'test',
        baseUrl: 'http://localhost:5023/',
        remoteEntryUrl:
          'http://localhost:4201/remoteEntry.js',
        appId: 'onecx-help-ui',
        productName: 'mfe1-ng16',
        exposedModule: './standalone-component-as-web-component',
        remoteName: 'mfe1-ng16',
        technology: 'WebComponentModule',
        elementName: 'my-mfe-element'
      });
      
      loadWorkspaceConfigResponse.slots
        .find((s: Slot) => s.name === 'menu')
        ?.components.push('test');

      loadWorkspaceConfigResponse.routes.push({
        url: 'http://localhost:5025/',
        baseUrl: '/admin/test',
        remoteEntryUrl:
          'http://localhost:4201/remoteEntry.js',
        appId: 'onecx-workspace-ui',
        productName: 'mfe1-ng16',
        technology: 'WebComponentModule',
        exposedModule: './standalone-component-as-web-component',
        pathMatch: 'prefix',
        remoteName: 'mfe1-ng16',
        displayName: 'OneCX Workspace',
        endpoints: [],
        elementName: 'my-mfe-element'
      });

      // loadWorkspaceConfigResponse.components.push({
      //   name: 'test',
      //   baseUrl: 'http://localhost:5023/',
      //   remoteEntryUrl:
      //     'https://nice-grass-018f7d910.azurestaticapps.net/remoteEntry.js',
      //   appId: 'onecx-help-ui',
      //   productName: 'angular1',
      //   exposedModule: './web-components',
      //   remoteName: 'angular1',
      //   technology: 'WebComponentScript',
      //   elementName: 'angular1-element'
      // });
      
      // loadWorkspaceConfigResponse.slots
      //   .find((s: Slot) => s.name === 'menu')
      //   ?.components.push('test');

      // loadWorkspaceConfigResponse.routes.push({
      //   url: 'http://localhost:5025/',
      //   baseUrl: '/admin/test',
      //   remoteEntryUrl:
      //     'https://nice-grass-018f7d910.azurestaticapps.net/remoteEntry.js',
      //   appId: 'onecx-workspace-ui',
      //   productName: 'angular1',
      //   technology: 'WebComponentScript',
      //   exposedModule: './web-components',
      //   pathMatch: 'prefix',
      //   remoteName: 'angular1',
      //   displayName: 'OneCX Workspace',
      //   endpoints: [],
      //   elementName: 'angular1-element'
      // });
      // loadWorkspaceConfigResponse.routes.push({
      //   url: 'http://localhost:4200/',
      //   baseUrl: '/admin/test',
      //   remoteEntryUrl: 'http://localhost:4200/remoteEntry.js',
      //   appId: 'onecxAnnouncementUi',
      //   productName: 'onecxAnnouncementUi',
      //   technology: 'WebComponent',
      //   exposedModule: './ocxAnnouncementApp',
      //   pathMatch: 'prefix',
      //   remoteName: 'ocx-announcement-app',
      //   displayName: 'OneCX Announcement',
      //   endpoints: [],
      // });
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
      // loadWorkspaceConfigResponse.slots
      //   .find((s: Slot) => s.name === 'subHeader')
      //   ?.components.push('test');
      // loadWorkspaceConfigResponse.slots = [];
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
    { provide: ErrorHandler, useClass: MyErrorHandler },
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
