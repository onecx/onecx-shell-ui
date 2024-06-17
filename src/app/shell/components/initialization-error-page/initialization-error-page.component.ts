import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SerializedInitializationError } from '../../utils/initialization-error-handler.utils';

@Component({
  template: `<div class="p-4">
    <h1>{{ 'INITIALIZATION_ERROR_PAGE_H1' | translate }}</h1>
    <div *ngIf="error.message">
      <p>
        {{ 'INITIALIZATION_ERROR_PAGE_MESSAGE' | translate }}
        {{ error.message }}
      </p>
    </div>
    <div *ngIf="error.requestedUrl">
      <p>
        {{ 'INITIALIZATION_ERROR_PAGE_REQUESTED_URL' | translate }}
        {{ error.requestedUrl }}
      </p>
    </div>
    <div *ngIf="error.detail">
      <p>
        {{ 'INITIALIZATION_ERROR_PAGE_DETAILS' | translate }}
        {{ error.detail }}
      </p>
    </div>
    <div *ngIf="error.errorCode">
      <p>
        {{ 'INITIALIZATION_ERROR_PAGE_ERRORCODE' | translate }}
        {{ error.errorCode }}
      </p>
    </div>
    <div *ngIf="error.invalidParams">
      <p>
        {{ 'INITIALIZATION_ERROR_PAGE_INVALID_PARAMS' | translate }}
        {{ error.invalidParams }}
      </p>
    </div>
    <div *ngIf="error.params">
      <p>
        {{ 'INITIALIZATION_ERROR_PAGE_PARAMS' | translate }}
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
