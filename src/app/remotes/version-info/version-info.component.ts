import { Component, inject, Inject, Input, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'
import { CommonModule } from '@angular/common'
import { UntilDestroy } from '@ngneat/until-destroy'
import { combineLatest, from, map, Observable, ReplaySubject } from 'rxjs'

import {
  AngularRemoteComponentsModule,
  BASE_URL,
  RemoteComponentConfig,
  ocxRemoteComponent,
  ocxRemoteWebcomponent
} from '@onecx/angular-remote-components'
import { AppStateService, CONFIG_KEY, ConfigurationService } from '@onecx/angular-integration-interface'
import { PortalCoreModule } from '@onecx/portal-integration-angular'

export type Version = {
  workspaceName: string
  shellInfo?: string
  mfeInfo?: string
  separator?: string
}

@Component({
  selector: 'ocx-shell-version-info',
  templateUrl: './version-info.component.html',
  standalone: true,
  imports: [AngularRemoteComponentsModule, CommonModule, PortalCoreModule],
  providers: [{ provide: BASE_URL, useValue: new ReplaySubject<string>(1) }],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
@UntilDestroy()
export class OneCXVersionInfoComponent implements ocxRemoteComponent, ocxRemoteWebcomponent {
  private readonly appState = inject(AppStateService)
  public readonly config = inject(ConfigurationService)

  @Input() set ocxRemoteComponentConfig(rcConfig: RemoteComponentConfig) {
    this.ocxInitRemoteComponent(rcConfig)
  }

  public versionInfo$: Observable<Version | undefined> = combineLatest([
    this.appState.currentMfe$.asObservable(),
    this.appState.currentWorkspace$.asObservable(),
    from(this.config.isInitialized)
  ]).pipe(
    map(([mfe, workspace]) => {
      const mfeVersion = mfe.version ?? ''
      const mfeInfo = mfe.displayName + (mfe.version ? ' ' + mfeVersion : '')
      const version: Version = {
        workspaceName: workspace.workspaceName,
        shellInfo: this.config.getProperty(CONFIG_KEY.APP_VERSION) ?? '',
        mfeInfo: mfe.displayName ? mfeInfo : '',
        separator: mfe.displayName || mfe.version ? ' - ' : ''
      }
      return version
    })
  )

  constructor(@Inject(BASE_URL) private readonly baseUrl: ReplaySubject<string>) {}

  public ocxInitRemoteComponent(rcConfig: RemoteComponentConfig) {
    this.baseUrl.next(rcConfig.baseUrl)
  }
}
