import { Component, OnInit } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'
import { PrimeNG } from 'primeng/config'
import { merge, mergeMap } from 'rxjs'

import { UserService } from '@onecx/angular-integration-interface'

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
    private readonly userService: UserService
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
      .pipe(mergeMap(() => this.translateService.get('SHELL')))
      .subscribe((res) => this.config.setTranslation(res))
  }
}
