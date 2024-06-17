import { Component } from '@angular/core'
import { AppStateService } from '@onecx/angular-integration-interface'
import { Workspace } from '@onecx/integration-interface'

@Component({
  template: `<div class="p-4">
      <h1>{{ "ERROR_PAGE_H1" | translate }}</h1>
      <div>{{ "PAGE_NOT_FOUND" | translate }}</div>
    </div>
    <div class="p-4">
      <button pButton [routerLink]="[workspace?.baseUrl]" routerLinkActive="router-link-active">{{ "TO_HOME_PAGE" | translate }} </button>
    </div> `,
})
export class ErrorPageComponent {
  workspace: Workspace | undefined
  constructor(private appStateService: AppStateService) {
    this.workspace = this.appStateService.currentWorkspace$.getValue()
  }
}
