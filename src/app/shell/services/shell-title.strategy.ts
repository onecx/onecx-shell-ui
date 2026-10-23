import { inject, Injectable, OnDestroy } from '@angular/core'
import { Title } from '@angular/platform-browser'
import { RouterStateSnapshot, TitleStrategy } from '@angular/router'
import { TranslateService } from '@ngx-translate/core'
import { AppStateService } from '@onecx/angular-integration-interface'
import { combineLatest, map, Observable, of, startWith, Subscription } from 'rxjs'

/** Route titles starting with this prefix are shell translation keys. */
export const SHELL_TITLE_KEY_PREFIX = 'PAGE_TITLES.'
export const TITLE_SEPARATOR = ' - '

/**
 * Builds the document title as "<page> - <workspace>" (WCAG 2.4.2).
 * - the deepest route title wins (Angular's buildTitle); MFE routes fall back to the app displayName set by the shell
 * - shell titles are translation keys and are re-translated on language change
 * - raw translation keys are never written to the document title
 */
@Injectable({ providedIn: 'root' })
export class ShellTitleStrategy extends TitleStrategy implements OnDestroy {
  private readonly title = inject(Title)
  private readonly translate = inject(TranslateService)
  private readonly appStateService = inject(AppStateService)
  private subscription?: Subscription

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const routeTitle = this.buildTitle(snapshot)
    this.subscription?.unsubscribe()
    this.subscription = combineLatest([this.translateTitle(routeTitle), this.workspaceName()]).subscribe(
      ([page, workspace]) => {
        const title = [page, workspace].filter((part): part is string => !!part).join(TITLE_SEPARATOR)
        if (title) this.title.setTitle(title)
      }
    )
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe()
  }

  private translateTitle(routeTitle: string | undefined): Observable<string | undefined> {
    if (!routeTitle?.startsWith(SHELL_TITLE_KEY_PREFIX)) return of(routeTitle)
    // stream() emits only after translations are loaded; ignore a not (yet) translated key
    return this.translate.stream(routeTitle).pipe(map((value) => (value === routeTitle ? undefined : value)))
  }

  private workspaceName(): Observable<string | undefined> {
    // the workspace may not be published (e.g. initialization error): do not block the title on it
    return this.appStateService.currentWorkspace$.asObservable().pipe(
      map((workspace) => workspace?.displayName || workspace?.workspaceName || undefined),
      startWith<string | undefined, [undefined]>(undefined)
    )
  }
}
