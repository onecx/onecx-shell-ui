import { Component, OnInit } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'
import { PrimeNG } from 'primeng/config'
import { merge, mergeMap } from 'rxjs'

import { CONFIG_KEY, ConfigurationService, POLYFILL_SCOPE_MODE, UserService } from '@onecx/angular-integration-interface'

@Component({
  standalone: false,
  selector: 'ocx-shell-root',
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {
  title = 'shell'

  constructor(
    private readonly translateService: TranslateService,
    private readonly config: PrimeNG,
    private readonly userService: UserService,
    private configService: ConfigurationService
  ) {}

  async ngOnInit() {
    this.userService.lang$.subscribe((lang) => {
      this.translateService.use(lang)
    })
    merge(
      this.translateService.onLangChange,
      this.translateService.onTranslationChange,
      this.translateService.onDefaultLangChange
    )
      .pipe(mergeMap(() => this.translateService.get('SHELL')))
      .subscribe((res) => this.config.setTranslation(res))

    
    const mode = await this.configService.getProperty(CONFIG_KEY.POLYFILL_SCOPE_MODE)
    if (mode === POLYFILL_SCOPE_MODE.PRECISION) {
      console.log('Using SCOPE_MODE PRECISION')
      // applyPrecisionPolyfill()
    } else {
      console.log('Using SCOPE_MODE PERFORMANCE.')
    }
  }

}
