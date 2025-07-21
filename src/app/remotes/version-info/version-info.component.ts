import { Component, Input, CUSTOM_ELEMENTS_SCHEMA, inject } from '@angular/core'
import { CommonModule } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { UntilDestroy } from '@ngneat/until-destroy'
import { combineLatest, from, map, Observable, ReplaySubject } from 'rxjs'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'

import {
  AngularRemoteComponentsModule,
  REMOTE_COMPONENT_CONFIG,
  RemoteComponentConfig,
  ocxRemoteComponent,
  ocxRemoteWebcomponent,
  provideTranslateServiceForRoot
} from '@onecx/angular-remote-components'
import { AngularAcceleratorModule } from '@onecx/angular-accelerator'
import { AppStateService, CONFIG_KEY, ConfigurationService } from '@onecx/angular-integration-interface'
import { remoteComponentTranslationPathFactory } from '@onecx/angular-utils'

type Version = {
  workspaceName: string
  hostVersion?: string
  mfeInfo?: string
  separator?: string
}

@Component({
  selector: 'ocx-shell-version-info',
  templateUrl: './version-info.component.html',
  standalone: true,
  imports: [AngularRemoteComponentsModule, CommonModule, TranslateModule, AngularAcceleratorModule],
  providers: [
    { provide: REMOTE_COMPONENT_CONFIG, useValue: new ReplaySubject<string>(1) },
    provideTranslateServiceForRoot({
      isolate: true,
      loader: {
        provide: TranslateLoader,
        useFactory: remoteComponentTranslationPathFactory,
        deps: [HttpClient, REMOTE_COMPONENT_CONFIG]
      }
    })
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
@UntilDestroy()
export class OneCXVersionInfoComponent implements ocxRemoteComponent, ocxRemoteWebcomponent {
  private readonly rcConfig = inject<ReplaySubject<string>>(REMOTE_COMPONENT_CONFIG)
  private readonly appState = inject(AppStateService)
  public readonly configurationService = inject(ConfigurationService)

  @Input() set ocxRemoteComponentConfig(config: RemoteComponentConfig) {
    this.ocxInitRemoteComponent(config)
  }

  public versionInfo$!: Observable<Version | undefined>

  constructor() {
    this.versionInfo$ = combineLatest([
      this.appState.currentMfe$.asObservable(),
      this.appState.currentWorkspace$.asObservable(),
      this.configurationService.getProperty(CONFIG_KEY.APP_VERSION),
      from(this.configurationService.isInitialized)
    ]).pipe(
      map(([mfe, workspace, hostVersion]) => {
        const version: Version = { workspaceName: workspace.workspaceName }
        const mfeInfoVersion = mfe.version ? ' ' + mfe.version : ''
        version.hostVersion = hostVersion
        version.separator = mfe.displayName || mfeInfoVersion !== '' ? ' - ' : ''
        version.mfeInfo = mfe.displayName ? mfe.displayName + mfeInfoVersion : ''
        return version
      })
    )
  }

  public ocxInitRemoteComponent(remoteComponentConfig: RemoteComponentConfig) {
    this.rcConfig.next(remoteComponentConfig.baseUrl)
  }
}
