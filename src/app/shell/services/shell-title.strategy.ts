import { inject, Injectable, OnDestroy } from '@angular/core'
import { Title } from '@angular/platform-browser'
import { RouterStateSnapshot, TitleStrategy } from '@angular/router'
import { TranslateService } from '@ngx-translate/core'
import { AppStateService, ConfigurationService } from '@onecx/angular-integration-interface'
import {
  combineLatest,
  defer,
  EMPTY,
  filter,
  map,
  Observable,
  of,
  shareReplay,
  startWith,
  Subscription,
  switchMap
} from 'rxjs'
import { isMfeRoute } from '../utils/mfe-route.utils'

/** Route titles starting with this prefix are shell translation keys. */
export const SHELL_TITLE_KEY_PREFIX = 'PAGE_TITLES.'
export const TITLE_SEPARATOR = ' - '
/** Configuration key that, if set to 'true', stops the shell from writing the document title on microfrontend routes. */
export const MFE_TITLES_DISABLED_CONFIG_KEY = 'ONECX_PORTAL_MFE_TITLES_DISABLED'

/**
 * Builds the document title as "<page> - <workspace>" (WCAG 2.4.2).
 * - the deepest route title wins (Angular's buildTitle); MFE routes fall back to the app displayName set by the shell
 * - shell titles are translation keys and are re-translated on language change
 * - raw translation keys are never written to the document title
 * - with ONECX_PORTAL_MFE_TITLES_DISABLED=true the title of microfrontend routes is left to the microfrontend
 */
@Injectable({ providedIn: 'root' })
export class ShellTitleStrategy extends TitleStrategy implements OnDestroy {
  private readonly title = inject(Title)
  private readonly translate = inject(TranslateService)
  private readonly appStateService = inject(AppStateService)
  private readonly configurationService = inject(ConfigurationService)
  private readonly mfeTitlesDisabled$ = defer(() => this.configurationService.getConfig()).pipe(
    map((config) => config?.[MFE_TITLES_DISABLED_CONFIG_KEY]?.trim().toLowerCase() === 'true'),
    shareReplay(1)
  )
  private subscription?: Subscription

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const routeTitle = this.buildTitle(snapshot)
    this.subscription?.unsubscribe()
    this.subscription = this.titleFor(snapshot, routeTitle).subscribe((title) => this.title.setTitle(title))
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe()
  }

  private titleFor(snapshot: RouterStateSnapshot, routeTitle: string | undefined): Observable<string> {
    const title$ = this.documentTitle(routeTitle)
    if (!isMfeRoute(snapshot)) return title$
    return this.mfeTitlesDisabled$.pipe(switchMap((disabled) => (disabled ? EMPTY : title$)))
  }

  private documentTitle(routeTitle: string | undefined): Observable<string> {
    return combineLatest([this.translateTitle(routeTitle), this.workspaceName()]).pipe(
      map(([page, workspace]) => [page, workspace].filter((part): part is string => !!part).join(TITLE_SEPARATOR)),
      filter((title) => !!title)
    )
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
