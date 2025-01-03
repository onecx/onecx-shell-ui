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
  templateUrl: './initialization-error-page.component.html'
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
