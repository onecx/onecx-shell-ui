import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { map, Observable } from 'rxjs'

import { resolveRelativeCssUrls } from './runtime-style.utils'

@Injectable()
export class StylesheetAssetUrlInterceptor implements HttpInterceptor {
  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (request.responseType !== 'text' || !new URL(request.url, document.baseURI).pathname.endsWith('/styles.css')) {
      return next.handle(request)
    }

    const stylesheetUrl = new URL(request.urlWithParams, document.baseURI).href
    return next.handle(request).pipe(
      map((event) => {
        if (
          !(event instanceof HttpResponse) ||
          typeof event.body !== 'string' ||
          !event.headers.get('Content-Type')?.includes('text/css')
        ) {
          return event
        }

        return event.clone({
          body: resolveRelativeCssUrls(event.body, event.url ?? stylesheetUrl)
        })
      })
    )
  }
}
