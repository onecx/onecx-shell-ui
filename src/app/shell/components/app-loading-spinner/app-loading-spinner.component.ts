import { LiveAnnouncer } from '@angular/cdk/a11y'
import { Component, inject, OnDestroy, OnInit } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'
import { firstValueFrom } from 'rxjs'

/** Loading that finishes faster than this is not announced, to avoid chatter on quick route changes. */
export const LOADING_ANNOUNCE_DELAY_MS = 1000

/**
 * Visual loading overlay of the main region (WCAG 4.1.3).
 *
 * The overlay itself is hidden from the accessibility tree and contains no live region, so nothing is
 * announced when it is rendered. If it stays visible longer than {@link LOADING_ANNOUNCE_DELAY_MS},
 * "Loading" is announced exactly once through the shared (persistent) LiveAnnouncer region, which is
 * also used for the page title announcement after the route change.
 */
@Component({
  standalone: true,
  selector: 'ocx-shell-loading-spinner',
  templateUrl: 'app-loading-spinner.component.html',
  styleUrl: 'app-loading-spinner.component.scss'
})
export class AppLoadingSpinnerComponent implements OnInit, OnDestroy {
  private readonly liveAnnouncer = inject(LiveAnnouncer)
  private readonly translateService = inject(TranslateService)
  private announceTimer?: ReturnType<typeof setTimeout>
  private destroyed = false

  ngOnInit(): void {
    this.announceTimer = setTimeout(() => this.announceLoading(), LOADING_ANNOUNCE_DELAY_MS)
  }

  ngOnDestroy(): void {
    this.destroyed = true
    clearTimeout(this.announceTimer)
  }

  private async announceLoading(): Promise<void> {
    const message = await firstValueFrom(this.translateService.get('LOADING'))
    if (this.destroyed) return
    await this.liveAnnouncer.announce(message, 'polite')
  }
}
