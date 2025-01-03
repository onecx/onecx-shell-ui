import { Component } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { SerializedInitializationError } from '../../utils/initialization-error-handler.utils'

@Component({
  template: `<div class="p-4">
    <h1 class="md:text-xl text-lg mb-1">{{ 'INITIALIZATION_ERROR_PAGE.TITLE' | translate }}</h1>
    <p class="text-base">{{ 'INITIALIZATION_ERROR_PAGE.SUBTITLE' | translate }}</p>
    <div class="mt-4 flex flex-column row-gap-2">
      <div *ngIf="error.message" class="md:text-base text-sm">
        <div>
          {{ 'INITIALIZATION_ERROR_PAGE.DETAILS.MESSAGE' | translate }}
        </div>
        <i>{{ error.message }}</i>
      </div>
      <div *ngIf="error.requestedUrl" class="md:text-base text-sm">
        <div>
          {{ 'INITIALIZATION_ERROR_PAGE.DETAILS.REQUESTED_URL' | translate }}
        </div>
        <i>{{ error.requestedUrl }}</i>
      </div>
      <div *ngIf="error.detail" class="md:text-base text-sm">
        <div>
          {{ 'INITIALIZATION_ERROR_PAGE.DETAILS.DETAILS' | translate }}
        </div>
        <i>{{ error.detail }}</i>
      </div>
      <div *ngIf="error.errorCode" class="md:text-base text-sm">
        <div>
          {{ 'INITIALIZATION_ERROR_PAGE.DETAILS.ERRORCODE' | translate }}
        </div>
        <i>{{ error.errorCode }}</i>
      </div>
      <div *ngIf="error.invalidParams" class="md:text-base text-sm">
        <div>
          {{ 'INITIALIZATION_ERROR_PAGE.DETAILS.INVALID_PARAMS' | translate }}
        </div>
        <i>{{ error.invalidParams }}</i>
      </div>
      <div *ngIf="error.params" class="md:text-base text-sm">
        <div>
          {{ 'INITIALIZATION_ERROR_PAGE.DETAILS.PARAMS' | translate }}
        </div>
        <i>{{ error.params }}</i>
      </div>
    </div>
  </div> `
})
export class InitializationErrorPageComponent {
  error: SerializedInitializationError
  constructor(private route: ActivatedRoute) {
    this.error = {
      message: this.route.snapshot.paramMap.get('message') ?? '',
      requestedUrl: this.route.snapshot.paramMap.get('requestedUrl') ?? '',
      detail: this.route.snapshot.paramMap.get('detail') ?? '',
      errorCode: this.route.snapshot.paramMap.get('errorCode') ?? '',
      params: this.route.snapshot.paramMap.get('params') ?? '',
      invalidParams: this.route.snapshot.paramMap.get('invalidParams') ?? ''
    }
  }
}
