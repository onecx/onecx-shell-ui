import { HTTP_INTERCEPTORS, HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http'
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { firstValueFrom } from 'rxjs'

import { StylesheetAssetUrlInterceptor } from './stylesheet-asset-url.interceptor'

describe('stylesheet asset URL interceptor', () => {
  let http: HttpClient
  let httpTestingController: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: HTTP_INTERCEPTORS, useClass: StylesheetAssetUrlInterceptor, multi: true }
      ]
    })

    http = TestBed.inject(HttpClient)
    httpTestingController = TestBed.inject(HttpTestingController)
  })

  it('resolves remote font URLs against the remote stylesheet URL', async () => {
    const response = firstValueFrom(http.get('/mfe/product-store/styles.css', { responseType: 'text' }))
    const request = httpTestingController.expectOne('/mfe/product-store/styles.css')

    request.flush('@font-face { src: url(fonts/primeicons.woff2); }', {
      headers: { 'Content-Type': 'text/css' }
    })

    await expect(response).resolves.toContain('url(http://localhost/mfe/product-store/fonts/primeicons.woff2)')
    httpTestingController.verify()
  })
})
