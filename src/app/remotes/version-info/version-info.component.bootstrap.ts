import { HttpClient } from '@angular/common/http'
import { TranslateLoader } from '@ngx-translate/core'
import { ReplaySubject } from 'rxjs'

import { bootstrapRemoteComponent } from '@onecx/angular-webcomponents'
import {
  REMOTE_COMPONENT_CONFIG,
  RemoteComponentConfig,
  provideTranslateServiceForRoot
} from '@onecx/angular-remote-components'
import { TRANSLATION_PATH, createTranslateLoader, remoteComponentTranslationPathFactory } from '@onecx/angular-utils'
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
