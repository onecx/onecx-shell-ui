import { inject, Injectable, OnDestroy } from '@angular/core'
import { Title } from '@angular/platform-browser'
import { RouterStateSnapshot, TitleStrategy } from '@angular/router'
import { TranslateService } from '@ngx-translate/core'
import { AppStateService } from '@onecx/angular-integration-interface'
import { DocumentTitle, DocumentTitleTopic } from '@onecx/integration-interface'
import { combineLatest, map, Observable, of, startWith, Subscription } from 'rxjs'
import { isMfeRoute } from '../utils/mfe-route.utils'

/** Route titles starting with this prefix are shell translation keys. */
export const SHELL_TITLE_KEY_PREFIX = 'PAGE_TITLES.'
export const TITLE_SEPARATOR = ' - '

/**
 * Builds the document title as "<page> - <workspace>" (WCAG 2.4.2).
 * - the deepest route title wins (Angular's buildTitle); MFE routes fall back to the app displayName set by the shell
 * - shell titles are translation keys and are re-translated on language change
 * - raw translation keys are never written to the document title
 * - on MFE routes, a title published by the MFE on the DocumentTitleTopic for the current location replaces the
 *   route title (also when it arrives after the navigation); titles published for other paths are ignored
 */
@Injectable({ providedIn: 'root' })
export class ShellTitleStrategy extends TitleStrategy implements OnDestroy {
  private readonly title = inject(Title)
  private readonly translate = inject(TranslateService)
  private readonly appStateService = inject(AppStateService)
  private readonly documentTitleTopic = new DocumentTitleTopic()
  private subscription?: Subscription

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const routeTitle = this.translateTitle(this.buildTitle(snapshot))
    const pageTitle = isMfeRoute(snapshot) ? this.mfeTitle(routeTitle) : routeTitle
    this.subscription?.unsubscribe()
    this.subscription = combineLatest([pageTitle, this.workspaceName()]).subscribe(([page, workspace]) => {
      const title = [page, workspace].filter((part): part is string => !!part).join(TITLE_SEPARATOR)
      if (title) this.title.setTitle(title)
    })
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe()
    this.documentTitleTopic.destroy()
  }

  private mfeTitle(routeTitle: Observable<string | undefined>): Observable<string | undefined> {
    const publishedTitle = this.documentTitleTopic.pipe(
      map((documentTitle) => titleForCurrentLocation(documentTitle)),
      startWith<string | undefined, [undefined]>(undefined)
    )
    return combineLatest([publishedTitle, routeTitle]).pipe(map(([published, fallback]) => published ?? fallback))
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

function titleForCurrentLocation(documentTitle: DocumentTitle): string | undefined {
  return documentTitle.path === document.location.pathname ? documentTitle.title || undefined : undefined
}
