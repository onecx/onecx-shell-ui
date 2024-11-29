import { Location } from '@angular/common'
import { Component } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { getLocation } from '@onecx/accelerator'

@Component({
  template: `
    <div class="p-4 flex flex-column gap-5">
      <div>
        <h1 class="md:text-2xl text-lg">{{ 'ERROR_PAGE.TITLE' | translate }}</h1>
        <p class="md:text-lg text-base mb-1">{{ 'ERROR_PAGE.DETAILS' | translate }}</p>
        <p class="md:text-base text-sm">{{ 'ERROR_PAGE.REQUESTED_PAGE' | translate }} {{ requestedApplicationPath }}</p>
      </div>
      <button pButton (click)="reloadPage()" routerLinkActive="router-link-active" class="w-max">
        {{ 'ERROR_PAGE.BUTTON' | translate }}
      </button>
    </div>
  `
})
export class ErrorPageComponent {
  requestedApplicationPath: string
  constructor(private route: ActivatedRoute) {
    this.requestedApplicationPath = this.route.snapshot.paramMap.get('requestedApplicationPath') ?? ''
  }

  reloadPage() {
    const pageLocation = getLocation()
    const reloadBaseUrl = Location.joinWithSlash(pageLocation.origin, pageLocation.deploymentPath)
    const reloadHref = Location.joinWithSlash(reloadBaseUrl, this.requestedApplicationPath)
    window.location.href = reloadHref
  }
}
