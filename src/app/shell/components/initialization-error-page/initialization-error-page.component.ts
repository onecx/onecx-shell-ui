import { Component } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { SerializedInitializationError } from '../../utils/initialization-error-handler.utils'

@Component({
  template: `<div class="p-4">
    <h1 class="md:text-2xl text-lg mb-1">{{ 'INITIALIZATION_ERROR_PAGE.TITLE' | translate }}</h1>
    <p class="md:text-lg text-base mb-1">{{ 'INITIALIZATION_ERROR_PAGE.SUBTITLE' | translate }}</p>
    <div class="flex flex-column row-gap-2">
      <ng-container *ngIf="error.message">
        <div class="md:text-base text-sm">
          {{ 'INITIALIZATION_ERROR_PAGE.DETAILS.MESSAGE' | translate }}
        </div>
        <i>{{ error.message }}</i>
      </ng-container>
      <ng-container *ngIf="error.requestedUrl">
        <div class="md:text-base text-sm">
          {{ 'INITIALIZATION_ERROR_PAGE.DETAILS.REQUESTED_URL' | translate }}
          <i>{{ error.requestedUrl }}</i>
        </div>
      </ng-container>
      <ng-container *ngIf="error.detail">
        <div class="md:text-base text-sm">
          {{ 'INITIALIZATION_ERROR_PAGE.DETAILS.DETAILS' | translate }}
          <i>{{ error.detail }}</i>
        </div>
      </ng-container>
      <ng-container *ngIf="error.errorCode">
        <div class="md:text-base text-sm">
          {{ 'INITIALIZATION_ERROR_PAGE.DETAILS.ERRORCODE' | translate }}
          <i>{{ error.errorCode }}</i>
        </div>
      </ng-container>
      <ng-container *ngIf="error.invalidParams">
        <div class="md:text-base text-sm">
          {{ 'INITIALIZATION_ERROR_PAGE.DETAILS.INVALID_PARAMS' | translate }}
          <i>{{ error.invalidParams }}</i>
        </div>
      </ng-container>
      <ng-container *ngIf="error.params">
        <div class="md:text-base text-sm">
          {{ 'INITIALIZATION_ERROR_PAGE.DETAILS.PARAMS' | translate }}
          <i>{{ error.params }}</i>
        </div>
      </ng-container>
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
