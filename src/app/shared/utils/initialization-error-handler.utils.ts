import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { ProblemDetailResponse } from '../generated';

type InitializationErrorDetails = ProblemDetailResponse;

interface InitializationError {
  message: string;
  details?: InitializationErrorDetails;
}

export interface SerializedInitializationError {
  message: string;
  requestedUrl: string;
  detail?: string;
  errorCode?: string;
  params?: string;
  invalidParams?: string;
}

export function initializationErrorHandler(
  error: any,
  router: Router
): Observable<any> {
  console.error(error);
  const initError: InitializationError = {
    message: '',
  };
  if (error instanceof ErrorEvent) {
    initError.message = error.error.message;
  } else if (error instanceof HttpErrorResponse) {
    initError.details = error.error;
    initError.message = error.message;
  }

  const params: SerializedInitializationError = {
    message: initError.message,
    requestedUrl: window.location.href,
    detail: initError.details?.detail ?? '',
    errorCode: initError.details?.errorCode ?? '',
    invalidParams: initError.details?.invalidParams
      ? `[${initError.details.invalidParams.map(
          (invalidParam) => `${invalidParam.name}: ${invalidParam.message}`
        )}]`
      : '',
    params: initError.details?.params
      ? `[${initError.details.params.map(
          (param) => `${param.key}: ${param.value}`
        )}]`
      : '',
  };

  router.navigate(['portal-initialization-error-page', params]);
  return of(undefined);
}
