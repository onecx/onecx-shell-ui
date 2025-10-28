import { HttpClient } from '@angular/common/http'
import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, inject } from '@angular/core'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import {
  AppStateService,
  Message,
  PortalMessageService,
  ThemeService,
  UserService,
} from '@onecx/angular-integration-interface'
import { MessageService } from 'primeng/api'
import { PrimeNG } from 'primeng/config'
import { filter, first, from, mergeMap, Observable, of } from 'rxjs'
import { AngularRemoteComponentsModule, SlotService } from '@onecx/angular-remote-components'
import { CommonModule } from '@angular/common'
import { RouterModule } from '@angular/router'
import { HeaderComponent } from '../portal-header/header.component'
import { GlobalErrorComponent } from '../error-component/global-error.component'
import { ToastModule } from 'primeng/toast'
import { TranslateModule } from '@ngx-translate/core'
import { AngularAcceleratorModule } from '@onecx/angular-accelerator'
import { AppLoadingSpinnerComponent } from '../app-loading-spinner/app-loading-spinner.component'
import { RoutesService } from '../../services/routes.service'
import { WorkspaceConfigBffService } from 'src/app/shared/generated/api/workspaceConfig.service'

@Component({
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    AngularAcceleratorModule,
    AngularRemoteComponentsModule,
    ToastModule,
    HeaderComponent,
    GlobalErrorComponent,
    AppLoadingSpinnerComponent,
    RouterModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'ocx-shell-portal-viewport',
  templateUrl: './portal-viewport.component.html',
  styleUrls: ['./portal-viewport.component.scss'],
})
@UntilDestroy()
export class PortalViewportComponent implements OnInit {
  private readonly primengConfig = inject(PrimeNG)
  private readonly messageService = inject(MessageService)
  private readonly appStateService = inject(AppStateService)
  private readonly portalMessageService = inject(PortalMessageService)
  private readonly userService = inject(UserService)
  themeService = inject(ThemeService)
  private readonly httpClient = inject(HttpClient)
  routesService = inject(RoutesService)
  workspaceConfigBffService = inject(WorkspaceConfigBffService)
  private readonly slotService = inject(SlotService)

  menuButtonTitle = ''

  colorScheme: 'auto' | 'light' | 'dark' = 'light'
  menuMode: 'horizontal' | 'static' | 'overlay' | 'slim' | 'slimplus' = 'static'
  inputStyle = 'outline'
  ripple = true
  globalErrMsg: string | undefined
  verticalMenuSlotName = 'onecx-shell-vertical-menu'
  isVerticalMenuComponentDefined$: Observable<boolean>
  footerSlotName = 'onecx-shell-footer'
  isFooterComponentDefined$: Observable<boolean>

  constructor() {
    this.portalMessageService.message$.subscribe((message: Message) => this.messageService.add(message))
    this.userService.profile$.pipe(untilDestroyed(this)).subscribe((profile) => {
      this.menuMode =
        (profile?.accountSettings?.layoutAndThemeSettings?.menuMode?.toLowerCase() as
          | typeof this.menuMode
          | undefined) ?? this.menuMode

      this.colorScheme =
        (profile?.accountSettings?.layoutAndThemeSettings?.colorScheme?.toLowerCase() as
          | typeof this.colorScheme
          | undefined) ?? this.colorScheme
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
        let link = document.querySelector("link[rel~='icon']") as any
        if (!link) {
          link = document.createElement('link')
          link.rel = 'icon'
          document.head.appendChild(link)
        }
        if (typeof url === 'string' && url !== null) {
          link.href = url
        }
      })

    this.isVerticalMenuComponentDefined$ = this.slotService.isSomeComponentDefinedForSlot(this.verticalMenuSlotName)
    this.isFooterComponentDefined$ = this.slotService.isSomeComponentDefinedForSlot(this.footerSlotName)
  }

  private readBlobAsDataURL(blob: Blob): Promise<string | ArrayBuffer | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result ?? null);
    reader.readAsDataURL(blob);
  });
}

  ngOnInit() {
    this.primengConfig.ripple.set(true)

    this.appStateService.globalError$
      .pipe(untilDestroyed(this))
      .pipe(filter((i) => i !== undefined))
      .subscribe((err: string | undefined) => {
        console.error('global error')
        this.globalErrMsg = err
      })
  }
}
