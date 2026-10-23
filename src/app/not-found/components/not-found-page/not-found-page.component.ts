import { AsyncPipe } from '@angular/common'
import { Component, inject } from '@angular/core'
import { Observable } from 'rxjs'

import { AppStateService } from '@onecx/angular-integration-interface'
import { Workspace } from '@onecx/integration-interface'
import { RouterModule } from '@angular/router'
import { TranslateModule } from '@ngx-translate/core'

@Component({
  standalone: true,
  imports: [AsyncPipe, RouterModule, TranslateModule],
  template: `
    <div class="p-4 flex flex-column gap-5">
      <div>
        <h1 class="md:text-xl text-lg">{{ 'NOT_FOUND_PAGE.TITLE' | translate }}</h1>
        <p class="">{{ 'NOT_FOUND_PAGE.DETAILS' | translate }}</p>
      </div>
      @if (workspace$ | async; as workspace) {
        <a
          id="onecxNotFoundPageAction"
          class="max-w-full underline"
          [routerLink]="[workspace.baseUrl]"
          [attr.title]="'NOT_FOUND_PAGE.ACTION.TOOLTIP' | translate"
        >
          {{ 'NOT_FOUND_PAGE.ACTION' | translate }}
        </a>
      }
    </div>
  `
})
export class PageNotFoundComponent {
  workspace$: Observable<Workspace>

  private readonly appStateService: AppStateService = inject(AppStateService)

  constructor() {
    this.appStateService.currentMfe$.publish({
      appId: '',
      baseHref: '/',
      mountPath: '',
      remoteBaseUrl: '',
      shellName: 'portal',
      productName: ''
    })
    this.workspace$ = this.appStateService.currentWorkspace$.asObservable()
  }
}
