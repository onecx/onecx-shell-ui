import { LiveAnnouncer } from '@angular/cdk/a11y'
import { AsyncPipe } from '@angular/common'
import { Component, inject, OnDestroy, OnInit } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'
import { catchError, firstValueFrom, Observable, of, shareReplay } from 'rxjs'

/** Loading that finishes faster than this is not announced, to avoid chatter on quick route changes. */
export const LOADING_ANNOUNCE_DELAY_MS = 1000

/**
 * Visual loading overlay of the main region (WCAG 4.1.3).
 *
 * The overlay itself is hidden from the accessibility tree and contains no live region, so nothing is
 * announced when it is rendered. If it stays visible longer than {@link LOADING_ANNOUNCE_DELAY_MS},
 * "Loading" is announced exactly once through the shared (persistent) LiveAnnouncer region, which is
 * also used for the page title announcement after the route change.
 *
 * With `prefers-reduced-motion: reduce` the spinner does not rotate; instead a static ring plus the
 * visible "Loading" text is shown (WCAG 2.3.3, 2.2.2). The text is visual only, it stays inside the
 * aria-hidden overlay so that it is not announced a second time.
 */
@Component({
  standalone: true,
  selector: 'ocx-shell-loading-spinner',
  imports: [AsyncPipe],
  templateUrl: 'app-loading-spinner.component.html',
  styleUrl: 'app-loading-spinner.component.scss'
})
export class AppLoadingSpinnerComponent implements OnInit, OnDestroy {
  private readonly liveAnnouncer = inject(LiveAnnouncer)
  private readonly translateService = inject(TranslateService)
  private announceTimer?: ReturnType<typeof setTimeout>
  private destroyed = false

  /** Translated "Loading" text, falling back to English when the translation fails. */
  readonly loadingText$: Observable<string> = this.translateService.get('LOADING').pipe(
    catchError(() => of('Loading')),
    shareReplay({ bufferSize: 1, refCount: true })
  )

  ngOnInit(): void {
    this.announceTimer = setTimeout(() => this.announceLoading(), LOADING_ANNOUNCE_DELAY_MS)
  }

  ngOnDestroy(): void {
    this.destroyed = true
    clearTimeout(this.announceTimer)
  }

  private async announceLoading(): Promise<void> {
    const message = await firstValueFrom(this.loadingText$)
    if (this.destroyed) return
    await this.liveAnnouncer.announce(message, 'polite')
  }
}
