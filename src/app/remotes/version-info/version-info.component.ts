import { Component, Inject, Input, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'
import { CommonModule } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { UntilDestroy } from '@ngneat/until-destroy'
import { combineLatest, from, map, Observable, ReplaySubject } from 'rxjs'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'

import {
  AngularRemoteComponentsModule,
  BASE_URL,
  RemoteComponentConfig,
  ocxRemoteComponent,
  ocxRemoteWebcomponent,
  provideTranslateServiceForRoot
} from '@onecx/angular-remote-components'
import { createRemoteComponentTranslateLoader } from '@onecx/angular-accelerator'
import { AppStateService, CONFIG_KEY, ConfigurationService } from '@onecx/angular-integration-interface'
import { PortalCoreModule } from '@onecx/portal-integration-angular'

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
  imports: [AngularRemoteComponentsModule, CommonModule, PortalCoreModule, TranslateModule],
  providers: [
    { provide: BASE_URL, useValue: new ReplaySubject<string>(1) },
    provideTranslateServiceForRoot({
      isolate: true,
      loader: {
        provide: TranslateLoader,
        useFactory: createRemoteComponentTranslateLoader,
        deps: [HttpClient, BASE_URL]
      }
    })
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
@UntilDestroy()
export class OneCXVersionInfoComponent implements ocxRemoteComponent, ocxRemoteWebcomponent {
  @Input() set ocxRemoteComponentConfig(config: RemoteComponentConfig) {
    this.ocxInitRemoteComponent(config)
  }

  public versionInfo$!: Observable<Version | undefined>

  constructor(
    @Inject(BASE_URL) private readonly baseUrl: ReplaySubject<string>,
    public readonly configurationService: ConfigurationService,
    private readonly appState: AppStateService
  ) {
    this.versionInfo$ = combineLatest([
      this.appState.currentMfe$.asObservable(),
      this.appState.currentWorkspace$.asObservable(),
      from(this.configurationService.isInitialized)
    ]).pipe(
      map(([mfe, workspace]) => {
        const version: Version = { workspaceName: workspace.workspaceName }
        const mfeInfoVersion = mfe?.version ? ' ' + mfe?.version : ''
        version.hostVersion = this.configurationService.getProperty(CONFIG_KEY.APP_VERSION) ?? ''
        version.separator = mfe?.displayName || mfeInfoVersion !== '' ? ' - ' : ''
        version.mfeInfo = mfe?.displayName ? mfe?.displayName + mfeInfoVersion : ''
        return version
      })
    )
  }

  public ocxInitRemoteComponent(remoteComponentConfig: RemoteComponentConfig) {
    this.baseUrl.next(remoteComponentConfig.baseUrl)
  }
}
