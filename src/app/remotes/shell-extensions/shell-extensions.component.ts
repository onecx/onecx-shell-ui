import { CommonModule } from '@angular/common'
import { Component, inject, Input, OnInit } from '@angular/core'
import { UntilDestroy } from '@ngneat/until-destroy'
import { ReplaySubject } from 'rxjs'

import { AngularAcceleratorModule } from '@onecx/angular-accelerator'
import { Message, PortalMessageService } from '@onecx/angular-integration-interface'
import {
  AngularRemoteComponentsModule,
  ocxRemoteComponent,
  ocxRemoteWebcomponent
} from '@onecx/angular-remote-components'
import { REMOTE_COMPONENT_CONFIG, RemoteComponentConfig } from '@onecx/angular-utils'
import { MessageService } from 'primeng/api'
import { PrimeNG } from 'primeng/config'
import { ToastModule } from 'primeng/toast'

// Should be moved out of shell to another repo later, so that primeNG dependency can be started to be removed from shell
@Component({
  selector: 'ocx-shell-extensions',
  templateUrl: './shell-extensions.component.html',
  standalone: true,
  imports: [AngularRemoteComponentsModule, CommonModule, AngularAcceleratorModule, ToastModule],
  providers: [{ provide: REMOTE_COMPONENT_CONFIG, useValue: new ReplaySubject<string>(1) }, MessageService]
})
@UntilDestroy()
export class OneCXShellExtensionsComponent implements ocxRemoteComponent, ocxRemoteWebcomponent, OnInit {
  private readonly rcConfig = inject<ReplaySubject<RemoteComponentConfig>>(REMOTE_COMPONENT_CONFIG)
  private readonly primengConfig = inject(PrimeNG)
  private readonly messageService = inject(MessageService)
  private readonly portalMessageService = inject(PortalMessageService)

  @Input() set ocxRemoteComponentConfig(rcConfig: RemoteComponentConfig) {
    this.ocxInitRemoteComponent(rcConfig)
  }

  constructor() {
    this.portalMessageService.message$.subscribe((message: Message) => this.messageService.add(message))
  }

  ngOnInit() {
    this.primengConfig.ripple.set(true)
  }

  public ocxInitRemoteComponent(rcConfig: RemoteComponentConfig) {
    this.rcConfig.next(rcConfig)
  }
}
