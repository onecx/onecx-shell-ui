import { Directive, Renderer2, AfterViewInit, OnDestroy, inject } from '@angular/core'
import { DOCUMENT } from '@angular/common'
import { CONFIG_KEY, ConfigurationService } from '@onecx/angular-integration-interface'
import { ParametersService } from '@onecx/angular-integration-interface'

@Directive({
  selector: '[ocxShellVisibleKeyboardFocus]',
  standalone: true
})
export class VisibleKeyboardFocusDirective implements AfterViewInit, OnDestroy {
  private activeHost: HTMLElement | null = null
  private keyboardMode = false

  private unlistenKeydown!: () => void
  private unlistenPointerDown!: () => void
  private unlistenFocusIn!: () => void
  private unlistenFocusOut!: () => void

  private renderer = inject(Renderer2)
  private document = inject(DOCUMENT)
  private configurationService = inject(ConfigurationService)
  private parametersService = inject(ParametersService)

  private focusableSelector = ''
  private defaultSelectors: string[] = []

  async ngAfterViewInit() {
    this.defaultSelectors = await this.configurationService
      .getConfig()
      .then((cfg) => (cfg?.[CONFIG_KEY.ONECX_KEYBOARD_FOCUSABLE_SELECTOR] ?? []) as string[])

    try {
      this.parametersService
        .get(CONFIG_KEY.ONECX_KEYBOARD_FOCUSABLE_SELECTOR, this.defaultSelectors, 'onecx-shell', 'onecx-shell-ui')
        .then((value: string[] | undefined) => {
          const set = new Set<string>([...(value ?? []), ...(this.defaultSelectors ?? [])])
          this.focusableSelector = [...set].join(',') ?? ''
        })
    } catch (e) {
      this.focusableSelector = this.defaultSelectors.join(',') ?? ''
    }

    this.unlistenKeydown = this.renderer.listen(this.document, 'keydown', (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        this.keyboardMode = true
      }
    })

    this.unlistenPointerDown = this.renderer.listen(this.document, 'pointerdown', () => {
      this.keyboardMode = false
    })

    this.unlistenFocusIn = this.renderer.listen(this.document, 'focusin', this.onFocusIn)

    this.unlistenFocusOut = this.renderer.listen(this.document, 'focusout', this.onFocusOut)
  }

  private onFocusIn = (event: FocusEvent) => {
    if (!this.keyboardMode) return

    const target = event.target as HTMLElement
    const host = (target.closest(this.focusableSelector) as HTMLElement | null) ?? target

    if (!host || host === this.document.body || host === this.document.documentElement) {
      return
    }

    if (this.activeHost !== host) {
      this.clear()
      this.activeHost = host
      this.renderer.addClass(host, 'ocx-focus-host')
    }
  }

  private onFocusOut = (event: FocusEvent) => {
    const nextTarget = event.relatedTarget as HTMLElement | null
    if (this.activeHost && nextTarget && this.activeHost.contains(nextTarget)) {
      return
    }
    this.clear()
  }

  private clear = () => {
    if (this.activeHost) {
      this.renderer.removeClass(this.activeHost, 'ocx-focus-host')
      this.activeHost = null
    }
  }

  ngOnDestroy() {
    this.unlistenFocusIn?.()
    this.unlistenFocusOut?.()
    this.unlistenKeydown?.()
    this.unlistenPointerDown?.()
  }
}
