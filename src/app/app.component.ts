import { Component, OnInit } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'
import { PrimeNGConfig } from 'primeng/api'
import { merge, mergeMap } from 'rxjs'

import { UserService } from '@onecx/angular-integration-interface'

@Component({
  selector: 'ocx-shell-root',
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {
  title = 'shell'

  constructor(
    private translateService: TranslateService,
    private config: PrimeNGConfig,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.userService.lang$.subscribe((lang) => {
      this.translateService.use(lang)
    })
    merge(
      this.translateService.onLangChange,
      this.translateService.onTranslationChange,
      this.translateService.onDefaultLangChange
    )
      .pipe(mergeMap(() => this.translateService.get('primeng')))
      .subscribe((res) => this.config.setTranslation(res))
  }
}
