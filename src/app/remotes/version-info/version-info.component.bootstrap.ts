import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http'
import { provideMissingTranslationHandler, provideTranslateLoader, provideTranslateService } from '@ngx-translate/core'
import { ReplaySubject } from 'rxjs'

import { bootstrapRemoteComponent } from '@onecx/angular-webcomponents'
import {
  MultiLanguageMissingTranslationHandler,
  OnecxTranslateLoader,
  provideTranslationPathFromMeta,
  REMOTE_COMPONENT_CONFIG,
  RemoteComponentConfig
} from '@onecx/angular-utils'

import { environment } from 'src/environments/environment'

import { OneCXVersionInfoComponent } from './version-info.component'

bootstrapRemoteComponent(OneCXVersionInfoComponent, 'ocx-version-info-component', environment.production, [
  { provide: REMOTE_COMPONENT_CONFIG, useValue: new ReplaySubject<RemoteComponentConfig>(1) },
  provideTranslateService({
    defaultLanguage: 'en',
    loader: provideTranslateLoader(OnecxTranslateLoader),
    missingTranslationHandler: provideMissingTranslationHandler(MultiLanguageMissingTranslationHandler)
  }),
  provideHttpClient(withInterceptorsFromDi()),
  provideTranslationPathFromMeta(import.meta.url, 'assets/i18n/')
])
