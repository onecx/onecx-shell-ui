import { Component } from '@angular/core'
import { AppStateService, Portal } from '@onecx/portal-integration-angular'

@Component({
  template: `<div class="p-4">
      <h1>Oops, we could not find that. {{ "ERROR_PAGE_H1" | translate }}</h1>
      <div>Page not found {{ "PAGE_NOT_FOUND" | translate }}</div>
    </div>
    <div class="p-4">
      <button pButton [routerLink]="[portal?.baseUrl]" routerLinkActive="router-link-active">Go to home page {{ "TO_HOME_PAGE" | translate }} </button>
    </div> `,
})
export class ErrorPageComponent {
  portal: Portal | undefined
  constructor(private appStateService: AppStateService) {
    this.portal = this.appStateService.currentPortal$.getValue()
  }
}
