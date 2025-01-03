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
    <h1 class="md:text-xl text-lg mb-1">{{ 'INITIALIZATION_ERROR_PAGE.TITLE' | translate }}</h1>
    <p class="text-base">{{ 'INITIALIZATION_ERROR_PAGE.SUBTITLE' | translate }}</p>
    <div class="mt-4 flex flex-column row-gap-2">
      <div *ngIf="error.message" class="md:text-base text-sm">
        <div>
          {{ 'INITIALIZATION_ERROR_PAGE.DETAILS.MESSAGE' | translate }}
        </div>
        <i>{{ error.message }}</i>
      </div>
      <div *ngIf="error.requestedUrl" id="onecxInitializationErrorRequestedUrl" class="md:text-base text-sm">
        <div>
          {{ 'INITIALIZATION_ERROR_PAGE.DETAILS.REQUESTED_URL' | translate }}
        </div>
        <i>{{ error.requestedUrl }}</i>
      </div>
      <div id="onecxInitializationErrorDetail" *ngIf="error.detail" class="md:text-base text-sm">
        <div>
          {{ 'INITIALIZATION_ERROR_PAGE.DETAILS.DETAILS' | translate }}
        </div>
        <i>{{ error.detail }}</i>
      </div>
      <div id="onecxInitializationErrorErrorCode" *ngIf="error.errorCode" class="md:text-base text-sm">
        <div>
          {{ 'INITIALIZATION_ERROR_PAGE.DETAILS.ERRORCODE' | translate }}
        </div>
        <i>{{ error.errorCode }}</i>
      </div>
      <div id="onecxInitializationErrorInvalidParams" *ngIf="error.invalidParams" class="md:text-base text-sm">
        <div>
          {{ 'INITIALIZATION_ERROR_PAGE.DETAILS.INVALID_PARAMS' | translate }}
        </div>
        <i>{{ error.invalidParams }}</i>
      </div>
      <div id="onecxInitializationErrorParams" *ngIf="error.params" class="md:text-base text-sm">
        <div>
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
