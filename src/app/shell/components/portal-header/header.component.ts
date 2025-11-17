import { animate, style, transition, trigger } from '@angular/animations'
import { CUSTOM_ELEMENTS_SCHEMA, Component, EventEmitter, Input, Output, inject } from '@angular/core'
import { UntilDestroy } from '@ngneat/until-destroy'
import { Observable } from 'rxjs'
import { Theme, ThemeService } from '@onecx/angular-integration-interface'
import { CommonModule } from '@angular/common'
import { TranslateModule } from '@ngx-translate/core'
import { AngularAcceleratorModule } from '@onecx/angular-accelerator'
import { AngularRemoteComponentsModule } from '@onecx/angular-remote-components'
import { TooltipModule } from 'primeng/tooltip'


@Component({
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    AngularAcceleratorModule,
    AngularRemoteComponentsModule,
    TooltipModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'ocx-shell-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  animations: [
    trigger('topbarActionPanelAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scaleY(0.8)' }),
        animate('.12s cubic-bezier(0, 0, 0.2, 1)', style({ opacity: 1, transform: '*' })),
      ]),
      transition(':leave', [animate('.1s linear', style({ opacity: 0 }))]),
    ]),
  ],
})
@UntilDestroy()
export class HeaderComponent {
  @Input() menuButtonTitle: string | undefined
  @Input() fullPortalLayout = true
  @Input() homeNavUrl = '/'
  @Input() homeNavTitle = 'Home'
  @Output() menuButtonClick: EventEmitter<any> = new EventEmitter()

  private readonly themeService = inject(ThemeService)

  menuExpanded = false
  // slot configuration: get theme logo
  public slotName = 'onecx-theme-data'
  public currentTheme$: Observable<Theme>
  public logoLoadingEmitter = new EventEmitter<boolean>()
  public themeLogoLoadingFailed = false

  constructor() {
    this.currentTheme$ = this.themeService.currentTheme$.asObservable()
    this.logoLoadingEmitter.subscribe((data: boolean) => {
      this.themeLogoLoadingFailed = data
    })
  }
}
