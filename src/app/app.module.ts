import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import { AppComponent } from './app.component';
import { appRoutes } from './app.routes';
import { RoutesService } from './shared/services/routes.service';
import { SLOT_SERVICE } from '@onecx/angular-remote-components';
import { ShellSlotService } from './shared/services/shell-slot.service';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import {
  MissingTranslationHandler,
  TranslateLoader,
  TranslateModule,
} from '@ngx-translate/core';
import {
  DEFAULT_LANG,
  TranslationCacheService,
  PortalMissingTranslationHandler,
  TranslateCombinedLoader,
  CachingTranslateLoader,
  AppStateService,
  ConfigurationService,
  PortalApiConfiguration,
  PortalCoreModule,
  ThemeService,
  UserService,
} from '@onecx/portal-integration-angular';
import {
  Configuration,
  UserBffService,
  WorkspaceConfigBffService,
} from './shared/generated';
import { ShellCoreModule } from '@onecx/shell-core';
import { firstValueFrom } from 'rxjs';
import { AngularRemoteComponentModule } from '@onecx/angular-remote-components'

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
  userProfileBffService: UserBffService,
  routesService: RoutesService,
  themeService: ThemeService,
  userService: UserService,
  shellSlotService: ShellSlotService
) {
  return async () => {
    const getWorkspaceConfigResponse = await firstValueFrom(
      workspaceConfigBffService.getWorkspaceConfig(window.location.href)
    );

    const getUserProfileResponse = await firstValueFrom(
      userProfileBffService.getUserProfile(window.location.href)
    );

    routesService.init(getWorkspaceConfigResponse.routes);
    await themeService.apply(getWorkspaceConfigResponse.theme);
    await userService.profile$.publish(getUserProfileResponse.userProfile);

    shellSlotService.remoteComponentMappings = getWorkspaceConfigResponse.shellRemoteComponents;
    await shellSlotService.remoteComponents.publish(getWorkspaceConfigResponse.remoteComponents); //TODO: create Service in angular-integration-interface
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

export function dummyPortalInitializer(appStateService: AppStateService) {
  return () =>
    appStateService.currentPortal$.publish({
      portalName: 'dummy',
      microfrontendRegistrations: [],
      baseUrl: '',
    });
}

export function apiConfigProvider(
  configService: ConfigurationService,
  appStateService: AppStateService
) {
  return new PortalApiConfiguration(
    Configuration,
    'shell-bff',
    configService,
    appStateService
  );
}

@NgModule({
  declarations: [AppComponent],
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
    PortalCoreModule.forRoot('shell', true),
    ShellCoreModule,
    AngularRemoteComponentModule,
    BrowserAnimationsModule,
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: appInitializer,
      deps: [
        WorkspaceConfigBffService,
        UserBffService,
        RoutesService,
        ThemeService,
        UserService,
        ShellSlotService
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
    {
      provide: APP_INITIALIZER,
      useFactory: dummyPortalInitializer, // TODO remove
      deps: [AppStateService],
      multi: true,
    },
    ShellSlotService,
    {
      provide: SLOT_SERVICE,
      useExisting: ShellSlotService,
    },
    {
      provide: Configuration,
      useFactory: apiConfigProvider,
      deps: [ConfigurationService, AppStateService],
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
