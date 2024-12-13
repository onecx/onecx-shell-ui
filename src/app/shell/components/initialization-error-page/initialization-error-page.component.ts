import { Component } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { Observable, map } from 'rxjs'

interface InitializationError {
  message: string
  requestedUrl: string
  detail: string | null
  errorCode: string | null
  params: string | null
  invalidParams: string | null
}

@Component({
  template: `<div class="p-4">
    <h1 class="md:text-2xl text-lg mb-1">{{ 'INITIALIZATION_ERROR_PAGE.TITLE' | translate }}</h1>
    <p class="md:text-lg text-base">{{ 'INITIALIZATION_ERROR_PAGE.SUBTITLE' | translate }}</p>
    <div *ngIf="error$ | async as error" class="mt-3 flex flex-column row-gap-2">
      <div id="onecxInitializationErrorMessage" *ngIf="error.message">
        <div class="md:text-base text-sm">
          {{ 'INITIALIZATION_ERROR_PAGE.DETAILS.MESSAGE' | translate }}
        </div>
        <i>{{ error.message }}</i>
      </div>
      <div id="onecxInitializationErrorRequestedUrl" *ngIf="error.requestedUrl">
        <div class="md:text-base text-sm">
          {{ 'INITIALIZATION_ERROR_PAGE.DETAILS.REQUESTED_URL' | translate }}
        </div>
        <i>{{ error.requestedUrl }}</i>
      </div>
      <div id="onecxInitializationErrorDetail" *ngIf="error.detail">
        <div class="md:text-base text-sm">
          {{ 'INITIALIZATION_ERROR_PAGE.DETAILS.DETAILS' | translate }}
        </div>
        <i>{{ error.detail }}</i>
      </div>
      <div id="onecxInitializationErrorErrorCode" *ngIf="error.errorCode">
        <div class="md:text-base text-sm">
          {{ 'INITIALIZATION_ERROR_PAGE.DETAILS.ERRORCODE' | translate }}
        </div>
        <i>{{ error.errorCode }}</i>
      </div>
      <div id="onecxInitializationErrorInvalidParams" *ngIf="error.invalidParams">
        <div class="md:text-base text-sm">
          {{ 'INITIALIZATION_ERROR_PAGE.DETAILS.INVALID_PARAMS' | translate }}
        </div>
        <i>{{ error.invalidParams }}</i>
      </div>
      <div id="onecxInitializationErrorParams" *ngIf="error.params">
        <div class="md:text-base text-sm">
          {{ 'INITIALIZATION_ERROR_PAGE.DETAILS.PARAMS' | translate }}
        </div>
        <i>{{ error.params }}</i>
      </div>
    </div>
  </div> `
})
export class InitializationErrorPageComponent {
  error$: Observable<InitializationError>

  constructor(private route: ActivatedRoute) {
    this.error$ = this.route.fragment.pipe(
      map((fragment) => {
        const params = new URLSearchParams(fragment ?? '')
        return {
          message: params.get('message') ?? '',
          requestedUrl: params.get('requestedUrl') ?? '',
          detail: params.get('detail'),
          errorCode: params.get('errorCode'),
          params: params.get('params'),
          invalidParams: params.get('invalidParams')
        }
      })
    )
  }
}
