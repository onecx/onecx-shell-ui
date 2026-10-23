import { Component, ElementRef, HostListener, inject, Input, OnInit, ChangeDetectorRef } from '@angular/core'
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
import { applyToastPolicy } from './toast-policy'

// Should be moved out of shell to another repo later, so that primeNG dependency can be started to be removed from shell
@Component({
  selector: 'ocx-shell-toast',
  templateUrl: './shell-toast.component.html',
  standalone: true,
  imports: [AngularRemoteComponentsModule, AngularAcceleratorModule, ToastModule],
  providers: [{ provide: REMOTE_COMPONENT_CONFIG, useValue: new ReplaySubject<string>(1) }, MessageService]
})
@UntilDestroy()
export class OneCXShellToastComponent implements ocxRemoteComponent, ocxRemoteWebcomponent, OnInit {
  private readonly rcConfig = inject<ReplaySubject<RemoteComponentConfig>>(REMOTE_COMPONENT_CONFIG)
  private readonly primengConfig: PrimeNG = inject(PrimeNG)
  private readonly messageService = inject(MessageService)
  private readonly portalMessageService = inject(PortalMessageService)
  private readonly cdr = inject(ChangeDetectorRef)
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef)

  @Input() set ocxRemoteComponentConfig(rcConfig: RemoteComponentConfig) {
    this.ocxInitRemoteComponent(rcConfig)
  }

  constructor() {
    this.portalMessageService.message$.subscribe((message: Message) => {
      this.messageService.add(applyToastPolicy(message))
      // Primng fails to trigger change detection automatically and which cuses the messages to get stacked and pushed once the change detection triggers
      // so we use setTimeout to manually trigger it
      setTimeout(() => this.cdr.detectChanges())
    })
  }

  // PrimeNG pauses the toast timer on mouseenter/mouseleave only. Forward keyboard focus to the same handlers.
  @HostListener('focusin', ['$event'])
  onFocusIn(event: FocusEvent) {
    const item = this.toastItem(event.target)
    if (item && !item.contains(event.relatedTarget as Node | null)) {
      item.dispatchEvent(new MouseEvent('mouseenter'))
    }
  }

  @HostListener('focusout', ['$event'])
  onFocusOut(event: FocusEvent) {
    const item = this.toastItem(event.target)
    if (item && !item.contains(event.relatedTarget as Node | null)) {
      item.dispatchEvent(new MouseEvent('mouseleave'))
    }
  }

  // PrimeNG has no keyboard shortcut for closing a toast: Escape closes the toast that contains the focus.
  @HostListener('keydown.escape', ['$event'])
  onEscape(event: Event) {
    const item = this.toastItem(event.target)
    const closeButton = item?.querySelector<HTMLElement>('button.p-toast-close-button')
    if (closeButton) {
      event.preventDefault()
      closeButton.click()
    }
  }

  private toastItem(target: EventTarget | null): HTMLElement | null {
    const el = target instanceof Element ? target : null
    const item = el?.closest<HTMLElement>('.p-toast-message')
    return item && this.host.nativeElement.contains(item) ? item : null
  }

  ngOnInit() {
    this.primengConfig.ripple.set(true)
  }

  public ocxInitRemoteComponent(rcConfig: RemoteComponentConfig) {
    this.rcConfig.next(rcConfig)
  }
}
