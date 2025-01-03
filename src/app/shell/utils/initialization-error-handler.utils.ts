import { Router } from '@angular/router'
import { HttpErrorResponse } from '@angular/common/http'
import { Observable, of } from 'rxjs'
import { ProblemDetailResponse } from 'src/app/shared/generated'

type InitializationErrorDetails = ProblemDetailResponse

interface InitializationError {
  message: string
  details?: InitializationErrorDetails
}

export function initializationErrorHandler(error: any, router: Router): Observable<any> {
  console.error(error)
  const initError: InitializationError = { message: '' }
  if (error instanceof ErrorEvent) {
    initError.message = error.error.message
  } else if (error instanceof HttpErrorResponse) {
    initError.details = error.error
    initError.message = error.message
  }

  const params = new URLSearchParams()
  params.set('message', initError.message)
  params.set('requestedUrl', window.location.href)
  params.set('detail', initError.details?.detail ?? '')
  params.set('errorCode', initError.details?.errorCode ?? '')
  params.set(
    'invalidParams',
    initError.details?.invalidParams
      ? '['.concat(initError.details.invalidParams.map((p) => `${p.name}: ${p.message}`).join(',')).concat(']')
      : ''
  )
  params.set(
    'params',
    initError.details?.params
      ? '['.concat(initError.details.params.map((p) => `${p.key}: ${p.value}`).join(',')).concat(']')
      : ''
  )

  router.navigate(['portal-initialization-error-page'], { fragment: params.toString() })
  return of(undefined)
}
