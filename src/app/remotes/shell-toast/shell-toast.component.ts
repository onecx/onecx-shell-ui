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
    // mouseenter/mouseleave do not bubble: listen in the capture phase to see them before PrimeNG's handlers on the toast
    const hostElement = this.host.nativeElement
    hostElement.addEventListener('mouseenter', (event) => this.onPointerEnter(event), true)
    hostElement.addEventListener('mouseleave', (event) => this.onPointerLeave(event), true)
  }

  /*
   * Pausing the toast timer while a toast is hovered OR has keyboard focus.
   *
   * Relies on PrimeNG 21.x internals (verified with 21.1.x) of the ToastItem in primeng/toast:
   * - each toast is rendered as `.p-toast-message` with `(mouseenter)="onMouseEnter()"` (clears the timer) and
   *   `(mouseleave)="onMouseLeave()"` (always restarts the timer) bound on that element,
   * - the close button has the class `p-toast-close-button` (used by onEscape).
   * PrimeNG only knows about the pointer, so focus is forwarded as synthetic mouseenter/mouseleave events, and a real
   * mouseleave is stopped in the capture phase while the toast still has focus.
   * If an upgrade changes these internals, the 'toast policy' tests in shell-toast.component.spec.ts fail, especially
   * 'keeps an info toast for at least 10 s, pauses while a control inside has focus ...',
   * 'keeps a focused toast paused when the pointer enters and leaves it',
   * 'keeps a hovered toast paused when the focus leaves it' and 'closes the focused toast on Escape'.
   */
  private readonly toastStates = new WeakMap<HTMLElement, { focused: boolean; hovered: boolean }>()
  private readonly syntheticEvents = new WeakSet<Event>()

  onPointerEnter(event: Event) {
    const item = this.pointerTarget(event)
    if (item) {
      this.toastState(item).hovered = true
    }
  }

  onPointerLeave(event: Event) {
    const item = this.pointerTarget(event)
    if (!item) return
    const state = this.toastState(item)
    state.hovered = false
    if (state.focused) {
      // keep the timer paused: PrimeNG's mouseleave handler on the toast would restart it
      event.stopPropagation()
    }
  }

  @HostListener('focusin', ['$event'])
  onFocusIn(event: FocusEvent) {
    const item = this.toastItem(event.target)
    if (!item || item.contains(event.relatedTarget as Node | null)) return
    const state = this.toastState(item)
    state.focused = true
    if (!state.hovered) {
      this.dispatchSynthetic(item, 'mouseenter')
    }
  }

  @HostListener('focusout', ['$event'])
  onFocusOut(event: FocusEvent) {
    const item = this.toastItem(event.target)
    if (!item || item.contains(event.relatedTarget as Node | null)) return
    const state = this.toastState(item)
    state.focused = false
    if (!state.hovered) {
      this.dispatchSynthetic(item, 'mouseleave')
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

  /** The toast item a real (non-synthetic) mouseenter/mouseleave was fired on, ignoring its descendants. */
  private pointerTarget(event: Event): HTMLElement | null {
    if (this.syntheticEvents.has(event)) return null
    const item = this.toastItem(event.target)
    return item === event.target ? item : null
  }

  private toastState(item: HTMLElement) {
    let state = this.toastStates.get(item)
    if (!state) {
      state = { focused: false, hovered: false }
      this.toastStates.set(item, state)
    }
    return state
  }

  private dispatchSynthetic(item: HTMLElement, type: 'mouseenter' | 'mouseleave') {
    const event = new MouseEvent(type)
    this.syntheticEvents.add(event)
    item.dispatchEvent(event)
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
