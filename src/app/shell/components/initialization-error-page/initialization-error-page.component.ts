import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SerializedInitializationError } from '../../utils/initialization-error-handler.utils';

@Component({
  template: `<div class="p-4">
    <h1 class="md:text-4xl text-2xl mb-1">{{ 'INITIALIZATION_ERROR_PAGE.TITLE' | translate }}</h1>
    <p class="md:text-2xl text-lg mb-1">{{ 'INITIALIZATION_ERROR_PAGE.SUBTITLE' | translate }}</p>
    <div *ngIf="error.message">
      <p class="md:text-lg text-sm">
        {{ 'INITIALIZATION_ERROR_PAGE.DETAILS.MESSAGE' | translate }}
        {{ error.message }}
      </p>
    </div>
    <div *ngIf="error.requestedUrl">
      <p class="md:text-lg text-sm">
        {{ 'INITIALIZATION_ERROR_PAGE.DETAILS.REQUESTED_URL' | translate }}
        {{ error.requestedUrl }}
      </p>
    </div>
    <div *ngIf="error.detail">
      <p class="md:text-lg text-sm">
        {{ 'INITIALIZATION_ERROR_PAGE.DETAILS.DETAILS' | translate }}
        {{ error.detail }}
      </p>
    </div>
    <div *ngIf="error.errorCode">
      <p class="md:text-lg text-sm">
        {{ 'INITIALIZATION_ERROR_PAGE.DETAILS.ERRORCODE' | translate }}
        {{ error.errorCode }}
      </p>
    </div>
    <div *ngIf="error.invalidParams">
      <p class="md:text-lg text-sm">
        {{ 'INITIALIZATION_ERROR_PAGE.DETAILS.INVALID_PARAMS' | translate }}
        {{ error.invalidParams }}
      </p>
    </div>
    <div *ngIf="error.params">
      <p class="md:text-lg text-sm">
        {{ 'INITIALIZATION_ERROR_PAGE.DETAILS.PARAMS' | translate }}
        {{ error.params }}
      </p>
    </div>
  </div> `,
})
export class InitializationErrorPageComponent {
  error: SerializedInitializationError;
  constructor(private route: ActivatedRoute) {
    this.error = {
      message: this.route.snapshot.paramMap.get('message') ?? '',
      requestedUrl: this.route.snapshot.paramMap.get('requestedUrl') ?? '',
      detail: this.route.snapshot.paramMap.get('detail') ?? '',
      errorCode: this.route.snapshot.paramMap.get('errorCode') ?? '',
      params: this.route.snapshot.paramMap.get('params') ?? '',
      invalidParams: this.route.snapshot.paramMap.get('invalidParams') ?? '',
    };
  }
}
