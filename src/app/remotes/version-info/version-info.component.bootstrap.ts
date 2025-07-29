import { HttpClient } from '@angular/common/http'
import { TranslateLoader } from '@ngx-translate/core'
import { ReplaySubject } from 'rxjs'

import { bootstrapRemoteComponent } from '@onecx/angular-webcomponents'
import { provideTranslateServiceForRoot } from '@onecx/angular-remote-components'
import {
  createTranslateLoader,
  REMOTE_COMPONENT_CONFIG,
  RemoteComponentConfig,
  remoteComponentTranslationPathFactory,
  TRANSLATION_PATH
} from '@onecx/angular-utils'

import { environment } from 'src/environments/environment'

import { OneCXVersionInfoComponent } from './version-info.component'

bootstrapRemoteComponent(OneCXVersionInfoComponent, 'ocx-version-info-component', environment.production, [
  { provide: REMOTE_COMPONENT_CONFIG, useValue: new ReplaySubject<RemoteComponentConfig>(1) },
  provideTranslateServiceForRoot({
    isolate: true,
    loader: {
      provide: TranslateLoader,
      useFactory: createTranslateLoader,
      deps: [HttpClient]
    }
  }),
  {
    provide: TRANSLATION_PATH,
    useFactory: (remoteComponentConfig: ReplaySubject<RemoteComponentConfig>) =>
      remoteComponentTranslationPathFactory('assets/i18n/')(remoteComponentConfig),
    multi: true,
    deps: [REMOTE_COMPONENT_CONFIG]
  }
])
