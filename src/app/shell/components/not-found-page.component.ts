import { Component } from '@angular/core'
import { Observable } from 'rxjs'

import { AppStateService } from '@onecx/angular-integration-interface'
import { Workspace } from '@onecx/integration-interface'

@Component({
  standalone: false,
  template: `
    <div class="p-4 flex flex-column gap-5">
      <div>
        <h1 class="md:text-xl text-lg">{{ 'NOT_FOUND_PAGE.TITLE' | translate }}</h1>
        <p class="">{{ 'NOT_FOUND_PAGE.DETAILS' | translate }}</p>
      </div>
      <button
        *ngIf="workspace$ | async as workspace"
        class="w-max"
        [routerLink]="[workspace.baseUrl]"
        [ngStyle]="{ cursor: 'pointer' }"
        [attr.aria-label]="'NOT_FOUND_PAGE.ACTION' | translate"
        [attr.title]="'NOT_FOUND_PAGE.ACTION.TOOLTIP' | translate"
      >
        {{ 'NOT_FOUND_PAGE.ACTION' | translate }}
      </button>
    </div>
  `
})
export class PageNotFoundComponent {
  workspace$: Observable<Workspace>

  constructor(private readonly appStateService: AppStateService) {
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
