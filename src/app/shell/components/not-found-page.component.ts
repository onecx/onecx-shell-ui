import { Component } from '@angular/core'
import { AppStateService } from '@onecx/angular-integration-interface'
import { Workspace } from '@onecx/integration-interface'

@Component({
  template: `
    <div class="p-4 flex flex-column gap-5">
      <div>
        <h1 class="md:text-xl text-lg">{{ 'NOT_FOUND_PAGE.TITLE' | translate }}</h1>
        <p class="">{{ 'NOT_FOUND_PAGE.DETAILS' | translate }}</p>
      </div>
      <button pButton [routerLink]="[workspace?.baseUrl]" class="w-max">
        {{ 'NOT_FOUND_PAGE.BUTTON' | translate }}
      </button>
    </div>
  `
})
export class PageNotFoundComponent {
  workspace: Workspace | undefined
  constructor(private appStateService: AppStateService) {
    this.appStateService.currentMfe$.publish({
      appId: '',
      baseHref: '/',
      mountPath: '',
      remoteBaseUrl: '',
      shellName: 'portal',
      productName: ''
    })
    this.workspace = this.appStateService.currentWorkspace$.getValue()
  }
}
