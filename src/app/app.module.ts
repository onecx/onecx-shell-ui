import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { AppComponent } from './app.component';
import { appRoutes } from './app.routes';
import { RoutesService } from './shared/services/routes.service';
import { SLOT_SERVICE } from '@onecx/shell-core';
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
} from '@onecx/portal-integration-angular';
import { Configuration } from './shared/generated';
import { ShellCoreModule } from '@onecx/shell-core'
import { AppInitializerService } from './shared/services/app-initializer.service';

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

export function appInitializer(appInitializerService: AppInitializerService) {
  return () => appInitializerService.init();
}

export function slotInitializer(slotService: ShellSlotService) {
  return () => slotService.init();
}

export function configurationServiceInitializer(configurationService: ConfigurationService) {
  return () => configurationService.init();
}

export function dummyPortalInitializer(appStateService: AppStateService) {
  return () => appStateService.currentPortal$.publish({
    portalName: 'dummy',
    microfrontendRegistrations: [],
    baseUrl: ''
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
    ShellCoreModule
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: appInitializer,
      deps: [AppInitializerService],
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
      useFactory: dummyPortalInitializer,// TODO remove
      deps: [AppStateService],
      multi: true,
    },
    {
      provide: SLOT_SERVICE,
      useClass: ShellSlotService,
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
