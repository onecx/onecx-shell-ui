import { Component } from '@angular/core'
import { Location } from '@angular/common'
import { ActivatedRoute } from '@angular/router'

import { getLocation } from '@onecx/accelerator'

@Component({
  standalone: false,
  template: `
    <div class="p-4 flex flex-column gap-5">
      <div>
        <h1 class="md:text-xl text-lg">{{ 'ERROR_PAGE.TITLE' | translate }}</h1>
        <p class="mb-1">{{ 'ERROR_PAGE.DETAILS' | translate }}</p>
        <p>
          <span class="font-bold"> {{ 'ERROR_PAGE.REQUESTED_PAGE' | translate }} </span>
          <i>{{ requestedApplicationPath }}</i>
        </p>
      </div>
      <button
        pButton
        (click)="reloadPage()"
        routerLinkActive="router-link-active"
        class="w-max"
        [ariaLabel]="'ERROR_PAGE.ACTION' | translate"
        [pTooltip]="'ERROR_PAGE.ACTION.TOOLTIP' | translate"
        tooltipPosition="top"
        tooltipEvent="hover"
      >
        {{ 'ERROR_PAGE.ACTION' | translate }}
      </button>
    </div>
  `
})
export class ErrorPageComponent {
  requestedApplicationPath: string
  constructor(private readonly route: ActivatedRoute) {
    this.requestedApplicationPath = this.route.snapshot.paramMap.get('requestedApplicationPath') ?? ''
  }

  reloadPage() {
    const pageLocation = getLocation()
    const reloadBaseUrl = Location.joinWithSlash(pageLocation.origin, pageLocation.deploymentPath)
    const reloadHref = Location.joinWithSlash(reloadBaseUrl, this.requestedApplicationPath)
    window.location.href = reloadHref
  }
}
