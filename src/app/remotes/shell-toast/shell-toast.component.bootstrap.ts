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

import { AngularAcceleratorModule } from '@onecx/angular-accelerator'

import { environment } from 'src/environments/environment'

import { OneCXShellToastComponent } from './shell-toast.component'
import { importProvidersFrom } from '@angular/core'

bootstrapRemoteComponent(OneCXShellToastComponent, 'ocx-shell-toast-component', environment.production, [
  { provide: REMOTE_COMPONENT_CONFIG, useValue: new ReplaySubject<RemoteComponentConfig>(1) },
  importProvidersFrom(AngularAcceleratorModule),
  provideTranslateService({
    defaultLanguage: 'en',
    loader: provideTranslateLoader(OnecxTranslateLoader),
    missingTranslationHandler: provideMissingTranslationHandler(MultiLanguageMissingTranslationHandler)
  }),
  provideHttpClient(withInterceptorsFromDi()),
  provideTranslationPathFromMeta(import.meta.url, 'assets/i18n/')
])
