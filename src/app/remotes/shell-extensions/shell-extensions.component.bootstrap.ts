import { HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http'
import { TranslateLoader } from '@ngx-translate/core'
import { ReplaySubject } from 'rxjs'

import { bootstrapRemoteComponent } from '@onecx/angular-webcomponents'
import { provideTranslateServiceForRoot } from '@onecx/angular-remote-components'
import {
  createTranslateLoader,
  provideTranslationPathFromMeta,
  REMOTE_COMPONENT_CONFIG,
  RemoteComponentConfig
} from '@onecx/angular-utils'

import { environment } from 'src/environments/environment'

import { OneCXShellExtensionsComponent } from './shell-extensions.component'
import { provideAnimations } from '@angular/platform-browser/animations'

bootstrapRemoteComponent(OneCXShellExtensionsComponent, 'ocx-shell-extensions-component', environment.production, [
  { provide: REMOTE_COMPONENT_CONFIG, useValue: new ReplaySubject<RemoteComponentConfig>(1) },
  provideAnimations(),
  provideTranslateServiceForRoot({
    isolate: true,
    loader: {
      provide: TranslateLoader,
      useFactory: createTranslateLoader,
      deps: [HttpClient]
    }
  }),
  provideHttpClient(withInterceptorsFromDi()),
  provideTranslationPathFromMeta(import.meta.url, 'assets/i18n/')
])
