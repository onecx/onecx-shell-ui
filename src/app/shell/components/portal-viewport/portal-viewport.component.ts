import { animate, style, transition, trigger } from '@angular/animations'
import { AsyncPipe } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component, ElementRef, EventEmitter, inject, OnInit, ViewChild } from '@angular/core'
import { RouterModule } from '@angular/router'
import { TranslatePipe } from '@ngx-translate/core'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { AppStateService, Theme, ThemeService, UserService } from '@onecx/angular-integration-interface'
import { AngularRemoteComponentsModule, SLOT_SERVICE } from '@onecx/angular-remote-components'
import { combineLatest, filter, first, from, map, mergeMap, Observable, of, shareReplay } from 'rxjs'
import { WorkspaceConfigBffService } from 'src/app/shared/generated/api/workspaceConfig.service'
import { RoutesService } from '../../services/routes.service'
import { AppLoadingSpinnerComponent } from '../app-loading-spinner/app-loading-spinner.component'
import { GlobalErrorComponent } from '../error-component/global-error.component'
import { SlotGroupComponent } from '../slot-group/slot-group.component'

@Component({
  standalone: true,
  imports: [
    AsyncPipe,
    AngularRemoteComponentsModule,
    GlobalErrorComponent,
    AppLoadingSpinnerComponent,
    RouterModule,
    SlotGroupComponent,
    TranslatePipe
  ],
  selector: 'ocx-shell-portal-viewport',
  templateUrl: './portal-viewport.component.html',
  styleUrl: './portal-viewport.component.scss',
  animations: [
    trigger('topbarActionPanelAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scaleY(0.8)' }),
        animate('.12s cubic-bezier(0, 0, 0.2, 1)', style({ opacity: 1, transform: '*' }))
      ]),
      transition(':leave', [animate('.1s linear', style({ opacity: 0 }))])
    ])
  ]
})
@UntilDestroy()
export class PortalViewportComponent implements OnInit {
  private readonly appStateService = inject(AppStateService)
  private readonly userService = inject(UserService)
  themeService = inject(ThemeService)
  private readonly httpClient = inject(HttpClient)
  routesService = inject(RoutesService)
  workspaceConfigBffService = inject(WorkspaceConfigBffService)
  private readonly slotService = inject(SLOT_SERVICE)

  // Landmarks are only exposed when their slot group has content
  headerHasContent$ = this.slotGroupHasContent('onecx-shell-header')
  menuHasContent$ = this.slotGroupHasContent('onecx-shell-body-start')
  footerHasContent$ = this.slotGroupHasContent('onecx-shell-footer')
  // Legacy footer slots are mapped to the body footer, it is the contentinfo unless the footer slot group is shown
  bodyFooterIsContentInfo$ = combineLatest([
    this.slotGroupHasContent('onecx-shell-body-footer'),
    this.footerHasContent$
  ]).pipe(map(([bodyFooterHasContent, footerHasContent]) => bodyFooterHasContent && !footerHasContent))

  @ViewChild('mainRegion') mainRegion?: ElementRef<HTMLElement>

  menuButtonTitle = ''
  // The document has <base href="/">, so a bare "#id" would resolve against the root URL.
  get skipLinkHref(): string {
    return `${globalThis.location.pathname}${globalThis.location.search}#ocx_main_content`
  }

  colorScheme: 'auto' | 'light' | 'dark' = 'light'
  menuMode: 'horizontal' | 'static' | 'overlay' | 'slim' | 'slimplus' = 'static'
  inputStyle = 'outline'
  ripple = true
  globalErrMsg: string | undefined
  verticalMenuSlotName = 'onecx-shell-vertical-menu'
  footerSlotName = 'onecx-shell-footer'

  public currentTheme$: Observable<Theme>
  public logoLoadingEmitter = new EventEmitter<boolean>()
  public themeLogoLoadingFailed = false

  slotHeaderInputs = {
    imageStyleClass: 'max-h-3rem max-w-9rem vertical-align-middle'
  }

  slotHeaderOutputs = {
    imageLoadingFailed: this.logoLoadingEmitter
  }

  constructor() {
    this.userService.profile$.pipe(untilDestroyed(this)).subscribe((profile) => {
      this.menuMode =
        (profile?.accountSettings?.layoutAndThemeSettings?.menuMode?.toLowerCase() as
          typeof this.menuMode | undefined) ?? this.menuMode

      this.colorScheme =
        (profile?.accountSettings?.layoutAndThemeSettings?.colorScheme?.toLowerCase() as
          typeof this.colorScheme | undefined) ?? this.colorScheme
    })

    this.themeService.currentTheme$
      .pipe(
        first(),
        mergeMap((theme) => {
          return (
            theme.faviconUrl
              ? this.httpClient.get(theme.faviconUrl ?? '', { responseType: 'blob' })
              : (this.workspaceConfigBffService?.getThemeFaviconByName(theme.name ?? '') ?? of())
          ).pipe(
            filter((blob) => !!blob),
            mergeMap((blob) => from(this.readBlobAsDataURL(blob)))
          )
        })
      )
      .subscribe((url) => {
        let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']")
        if (!link) {
          link = document.createElement('link')
          link.rel = 'icon'
          document.head.appendChild(link)
        }
        if (typeof url === 'string' && url !== null) {
          link.href = url
        }
      })

    this.currentTheme$ = this.themeService.currentTheme$.asObservable()
    this.logoLoadingEmitter.subscribe((data: boolean) => {
      this.themeLogoLoadingFailed = data
    })
  }

  onSkipLinkClick(event: Event) {
    event.preventDefault()
    this.mainRegion?.nativeElement.focus()
  }

  private slotGroupHasContent(slotGroupName: string): Observable<boolean> {
    return combineLatest(
      ['start', 'center', 'end'].map((position) =>
        this.slotService.isSomeComponentDefinedForSlot(`${slotGroupName}.${position}`)
      )
    ).pipe(
      map((slotsHaveContent) => slotsHaveContent.some(Boolean)),
      shareReplay({ bufferSize: 1, refCount: true })
    )
  }

  private readBlobAsDataURL(blob: Blob): Promise<string | ArrayBuffer | null> {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result ?? null)
      reader.readAsDataURL(blob)
    })
  }

  ngOnInit() {
    this.appStateService.globalError$
      .pipe(untilDestroyed(this))
      .pipe(filter((i) => i !== undefined))
      .subscribe((err: string | undefined) => {
        console.error('global error')
        this.globalErrMsg = err
      })
  }
}
