import {
  HTTP_INTERCEPTORS,
  HttpClient,
  HttpEvent,
  HttpEventType,
  HttpHandler,
  HttpHeaders,
  HttpRequest,
  HttpResponse,
  HttpSentEvent,
  provideHttpClient,
  withInterceptorsFromDi
} from '@angular/common/http'
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { firstValueFrom, of } from 'rxjs'

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

  it('leaves non-text requests unchanged', async () => {
    const response = firstValueFrom(http.get('/mfe/product-store/styles.css'))
    const request = httpTestingController.expectOne('/mfe/product-store/styles.css')
    request.flush({ asset: 'unchanged' })

    await expect(response).resolves.toEqual({ asset: 'unchanged' })
  })

  it('leaves text responses from non-stylesheet URLs unchanged', async () => {
    const response = firstValueFrom(http.get('/mfe/product-store/theme.css', { responseType: 'text' }))
    const request = httpTestingController.expectOne('/mfe/product-store/theme.css')
    request.flush('src: url(font.woff2)', { headers: { 'Content-Type': 'text/css' } })

    await expect(response).resolves.toBe('src: url(font.woff2)')
  })

  it('passes through non-response HTTP events', async () => {
    const event: HttpSentEvent = { type: HttpEventType.Sent }

    await expect(interceptEvent(event)).resolves.toBe(event)
  })

  it('passes through responses with non-text bodies', async () => {
    const response = new HttpResponse({
      body: 42,
      headers: new HttpHeaders({ 'Content-Type': 'text/css' })
    })

    await expect(interceptEvent(response)).resolves.toBe(response)
  })

  it('passes through stylesheet responses without a content type', async () => {
    const response = new HttpResponse({ body: 'src: url(font.woff2)' })

    await expect(interceptEvent(response)).resolves.toBe(response)
  })

  it('passes through stylesheet responses with a non-CSS content type', async () => {
    const response = new HttpResponse({
      body: 'src: url(font.woff2)',
      headers: new HttpHeaders({ 'Content-Type': 'text/plain' })
    })

    await expect(interceptEvent(response)).resolves.toBe(response)
  })

  it('resolves relative assets against the response URL when provided', async () => {
    const response = new HttpResponse({
      body: 'src: url(fonts/icon.woff2)',
      headers: new HttpHeaders({ 'Content-Type': 'text/css' }),
      url: 'https://cdn.example.com/styles.css'
    })

    await expect(interceptEvent(response)).resolves.toMatchObject({
      body: 'src: url(https://cdn.example.com/fonts/icon.woff2)'
    })
  })

  it('uses the request URL when the response URL is unavailable', async () => {
    const response = new HttpResponse({
      body: 'src: url(fonts/icon.woff2)',
      headers: new HttpHeaders({ 'Content-Type': 'text/css' })
    })

    await expect(interceptEvent(response)).resolves.toMatchObject({
      body: 'src: url(http://localhost/mfe/product-store/fonts/icon.woff2)'
    })
  })
})

function interceptEvent(event: HttpEvent<unknown>): Promise<HttpEvent<unknown>> {
  const request = new HttpRequest('GET', 'http://localhost/mfe/product-store/styles.css', {
    responseType: 'text'
  })
  const handler: HttpHandler = { handle: () => of(event) }

  return firstValueFrom(new StylesheetAssetUrlInterceptor().intercept(request, handler))
}
