import { LiveAnnouncer } from '@angular/cdk/a11y'
import { DOCUMENT } from '@angular/common'
import { inject, Injectable, NgZone, OnDestroy } from '@angular/core'
import { NavigationEnd, Router } from '@angular/router'
import { filter, Subscription } from 'rxjs'

/**
 * Candidates for the shell main region, in priority order: #1051 renders `<main id="ocx_main_content">`,
 * older templates use the body containers. They are looked up one after another, because a single
 * comma-separated selector would return the first match in document order instead.
 */
export const MAIN_REGION_SELECTORS = ['#ocx_main_content', 'main', '.onecx-body', '.onecx-no-theme-content'] as const
/** Shell scroll containers around the main region that return to the top on a route change. */
export const SCROLL_CONTAINER_SELECTOR = '.onecx-body-center, .onecx-body-wrapper'
/** Focus inside one of these belongs to a dialog that manages its own focus and must not be interrupted. */
export const DIALOG_SELECTOR = '[role="dialog"], [role="alertdialog"], [aria-modal="true"], dialog[open]'
/** The title is announced once it did not change for this long (shell and MFE titles are set asynchronously). */
export const TITLE_SETTLE_MS = 500
/** Upper bound for waiting on a stable title. */
export const TITLE_MAX_WAIT_MS = 3000

/**
 * Route change handling for keyboard and screen reader users (WCAG 2.4.3, 4.1.3).
 *
 * After a navigation that changes the path (switching MFE or within one MFE), the main region gets focus,
 * its scroll containers return to the top and the new document title is announced politely, once.
 * Nothing happens on the first load (before any user interaction), on query-parameter or fragment-only
 * navigations and on skipped navigations. Focus that is already inside the main region or inside a dialog
 * is left alone, so MFEs that manage their own focus are not interrupted.
 */
@Injectable({ providedIn: 'root' })
export class NavigationFocusService implements OnDestroy {
  private readonly router = inject(Router)
  private readonly liveAnnouncer = inject(LiveAnnouncer)
  private readonly document = inject(DOCUMENT)
  private readonly ngZone = inject(NgZone)

  private subscription?: Subscription
  private lastPath?: string
  private userHasInteracted = false
  private cancelPending?: () => void

  private readonly onUserInteraction = () => {
    this.userHasInteracted = true
    this.removeInteractionListeners()
  }

  init(): void {
    if (this.subscription) return
    this.document.addEventListener('keydown', this.onUserInteraction, true)
    this.document.addEventListener('pointerdown', this.onUserInteraction, true)
    this.subscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.onNavigationEnd(event))
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe()
    this.removeInteractionListeners()
    this.cancelPending?.()
  }

  private onNavigationEnd(event: NavigationEnd): void {
    const path = event.urlAfterRedirects.split(/[?#]/)[0]
    const previousPath = this.lastPath
    this.lastPath = path
    // first load (incl. redirects before the user did anything) and query/fragment-only changes keep focus
    if (previousPath === undefined || previousPath === path || !this.userHasInteracted) return
    this.ngZone.runOutsideAngular(() => this.handleRouteChange())
  }

  private handleRouteChange(): void {
    this.cancelPending?.()
    // let the router outlet and the MFE render before touching focus and scroll position
    const renderTimer = setTimeout(() => {
      this.resetScroll()
      this.moveFocus(false)
    })
    const stopWaiting = this.waitForStableTitle(() => {
      this.cancelPending = undefined
      // content replaced late (lazy remotes) may have dropped focus to the body in the meantime
      this.moveFocus(true)
      const title = this.document.title.trim()
      if (title) this.liveAnnouncer.announce(title, 'polite')
    })
    this.cancelPending = () => {
      clearTimeout(renderTimer)
      stopWaiting()
      this.cancelPending = undefined
    }
  }

  private waitForStableTitle(onStable: () => void): () => void {
    let lastTitle = this.document.title
    let settleTimer = setTimeout(() => finish(), TITLE_SETTLE_MS)
    const maxTimer = setTimeout(() => finish(), TITLE_MAX_WAIT_MS)
    const observer = new MutationObserver(() => {
      if (this.document.title === lastTitle) return
      lastTitle = this.document.title
      clearTimeout(settleTimer)
      settleTimer = setTimeout(() => finish(), TITLE_SETTLE_MS)
    })
    observer.observe(this.document.head, { subtree: true, childList: true, characterData: true })
    const stop = () => {
      observer.disconnect()
      clearTimeout(settleTimer)
      clearTimeout(maxTimer)
    }
    const finish = () => {
      stop()
      onStable()
    }
    return stop
  }

  /** Only the main region and the shell scroll containers around it; the document scroll position is left alone. */
  private resetScroll(): void {
    const main = this.mainRegion()
    if (!main) return
    main.scrollTop = 0
    this.document.querySelectorAll<HTMLElement>(SCROLL_CONTAINER_SELECTOR).forEach((container) => {
      if (container.contains(main)) container.scrollTop = 0
    })
  }

  private moveFocus(onlyIfLost: boolean): void {
    const main = this.mainRegion()
    if (!main) return
    const active = this.document.activeElement
    const focusLost = !active || active === this.document.body || !active.isConnected
    if (!focusLost && (onlyIfLost || main.contains(active) || active.closest(DIALOG_SELECTOR))) return
    if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1')
    main.focus({ preventScroll: true })
  }

  private mainRegion(): HTMLElement | null {
    for (const selector of MAIN_REGION_SELECTORS) {
      const region = this.document.querySelector<HTMLElement>(selector)
      if (region) return region
    }
    return null
  }

  private removeInteractionListeners(): void {
    this.document.removeEventListener('keydown', this.onUserInteraction, true)
    this.document.removeEventListener('pointerdown', this.onUserInteraction, true)
  }
}
