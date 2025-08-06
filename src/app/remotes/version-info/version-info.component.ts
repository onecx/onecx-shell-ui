import { Component, Input, CUSTOM_ELEMENTS_SCHEMA, inject } from '@angular/core'
import { CommonModule } from '@angular/common'
import { UntilDestroy } from '@ngneat/until-destroy'
import { combineLatest, from, map, Observable, ReplaySubject } from 'rxjs'

import { REMOTE_COMPONENT_CONFIG, RemoteComponentConfig } from '@onecx/angular-utils'
import {
  AngularRemoteComponentsModule,
  ocxRemoteComponent,
  ocxRemoteWebcomponent
} from '@onecx/angular-remote-components'
import { AppStateService, CONFIG_KEY, ConfigurationService } from '@onecx/angular-integration-interface'
import { AngularAcceleratorModule } from '@onecx/angular-accelerator'

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
  imports: [AngularRemoteComponentsModule, CommonModule, AngularAcceleratorModule],
  providers: [{ provide: REMOTE_COMPONENT_CONFIG, useValue: new ReplaySubject<string>(1) }],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
@UntilDestroy()
export class OneCXVersionInfoComponent implements ocxRemoteComponent, ocxRemoteWebcomponent {
  private readonly rcConfig = inject<ReplaySubject<RemoteComponentConfig>>(REMOTE_COMPONENT_CONFIG)
  private readonly appState = inject(AppStateService)
  public readonly config = inject(ConfigurationService)

  @Input() set ocxRemoteComponentConfig(rcConfig: RemoteComponentConfig) {
    this.ocxInitRemoteComponent(rcConfig)
  }

  public versionInfo$: Observable<Version | undefined> = combineLatest([
    this.appState.currentMfe$.asObservable(),
    this.appState.currentWorkspace$.asObservable(),
    this.config.getProperty(CONFIG_KEY.APP_VERSION),
    from(this.config.isInitialized)
  ]).pipe(
    map(([mfe, workspace, hostVersion]) => {
      const mfeVersion = mfe.version ?? ''
      const mfeInfo = mfe.displayName + (mfe.version ? ' ' + mfeVersion : '')
      const version: Version = {
        workspaceName: workspace.workspaceName,
        shellInfo: hostVersion,
        mfeInfo: mfe.displayName ? mfeInfo : '',
        separator: mfe.displayName || mfe.version ? ' - ' : ''
      }
      return version
    })
  )

  public ocxInitRemoteComponent(rcConfig: RemoteComponentConfig) {
    this.rcConfig.next(rcConfig)
  }
}
