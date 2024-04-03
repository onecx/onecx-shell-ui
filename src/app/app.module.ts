import { HttpClient, HttpClientModule } from '@angular/common/http';
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import {
  MissingTranslationHandler,
  TranslateLoader,
  TranslateModule
} from '@ngx-translate/core';
import { RemoteComponentsService } from '@onecx/angular-integration-interface';
import {
  AngularRemoteComponentsModule,
  SLOT_SERVICE
} from '@onecx/angular-remote-components';
import { KeycloakAuthModule } from '@onecx/keycloak-auth';
import {
  AppStateService,
  APP_CONFIG,
  CachingTranslateLoader,
  ConfigurationService,
  DEFAULT_LANG,
  PortalCoreModule,
  PortalMissingTranslationHandler,
  ThemeService,
  TranslateCombinedLoader,
  TranslationCacheService,
  UserService
} from '@onecx/portal-integration-angular';
import { ShellCoreModule } from '@onecx/shell-core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../environments/environment';
import { AppComponent } from './app.component';
import { appRoutes } from './app.routes';
import { ErrorPageComponent } from './shared/components/error-page.component';
import { HomeComponent } from './shared/components/home/home.component';
import {
  BASE_PATH,
  UserProfileBffService,
  WorkspaceConfigBffService
} from './shared/generated';
import { RoutesService } from './shared/services/routes.service';
import { ShellSlotService } from './shared/services/shell-slot.service';

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

export function appInitializer(
  workspaceConfigBffService: WorkspaceConfigBffService,
  userProfileBffService: UserProfileBffService,
  routesService: RoutesService,
  themeService: ThemeService,
  userService: UserService,
  shellSlotService: ShellSlotService,
  appStateService: AppStateService,
  remoteComponentsService: RemoteComponentsService
) {
  return async () => {
    await appStateService.isAuthenticated$.isInitialized;
    const getWorkspaceConfigResponse = await firstValueFrom(
      workspaceConfigBffService.getWorkspaceConfig({
        url: window.location.href,
      })
    );

    const getUserProfileResponse = await firstValueFrom(
      userProfileBffService.getUserProfile()
    );

    await appStateService.currentWorkspace$.publish({
      baseUrl: getWorkspaceConfigResponse.workspace.baseUrl,
      portalName: getWorkspaceConfigResponse.workspace.name,
      microfrontendRegistrations: [],
    });
    routesService.init(getWorkspaceConfigResponse.routes);

    const parsedProperties = JSON.parse(
      getWorkspaceConfigResponse.theme.properties
    ) as Record<string, Record<string, string>>;
    const themeWithParsedProperties = {
      ...getWorkspaceConfigResponse.theme,
      properties: parsedProperties,
    };
    await themeService.apply(themeWithParsedProperties);

    await userService.profile$.publish(getUserProfileResponse.userProfile);

    shellSlotService.remoteComponentMappings =
      getWorkspaceConfigResponse.shellRemoteComponents;
    await remoteComponentsService.remoteComponents$.publish(
      getWorkspaceConfigResponse.remoteComponents
    ); //TODO: create Service in angular-integration-interface
  };
}

export function slotInitializer(slotService: ShellSlotService) {
  return () => slotService.init();
}

export function configurationServiceInitializer(
  configurationService: ConfigurationService
) {
  return () => configurationService.init();
}

@NgModule({
  declarations: [AppComponent, ErrorPageComponent, HomeComponent],
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
        useClass: PortalMissingTranslationHandler,
      },
    }),
    ShellCoreModule,
    PortalCoreModule.forRoot('shell', true),
    AngularRemoteComponentsModule,
    BrowserAnimationsModule,
    RouterModule,
    KeycloakAuthModule,
  ],
  providers: [
    { provide: APP_CONFIG, useValue: environment },
    {
      provide: APP_INITIALIZER,
      useFactory: appInitializer,
      deps: [
        WorkspaceConfigBffService,
        UserProfileBffService,
        RoutesService,
        ThemeService,
        UserService,
        ShellSlotService,
        AppStateService,
        RemoteComponentsService,
      ],
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
    ShellSlotService,
    {
      provide: SLOT_SERVICE,
      useExisting: ShellSlotService,
    },
    {
      provide: BASE_PATH,
      useValue: './shell-bff',
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
