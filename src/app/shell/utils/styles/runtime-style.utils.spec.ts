import { HttpClient, HttpEvent, HttpHandler, HttpRequest, HttpResponse } from '@angular/common/http'
import { Observable, of, throwError } from 'rxjs'

import { fetchRuntimeStyle, resolveRelativeCssUrls, resolveRuntimeStyleUrl } from './runtime-style.utils'

describe('runtime style utils', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
  })

  it('resolves a hashed stylesheet from the manifest', async () => {
    const http = createHttpClient(() => of(new HttpResponse({ body: { 'shell-styles': 'shell-styles.123abc.css' } })))
    const url = resolveRuntimeStyleUrl(http, 'shell-styles')

    await expect(url).resolves.toBe('./shell-styles.123abc.css')
  })

  it('falls back to the unhashed stylesheet when the manifest is unavailable', async () => {
    const http = createHttpClient(() => throwError(() => new Error('manifest not found')))
    const url = resolveRuntimeStyleUrl(http, 'shell-styles')

    await expect(url).resolves.toBe('./shell-styles.css')
  })

  it('falls back to the unhashed stylesheet when the manifest has no matching bundle', async () => {
    const http = createHttpClient(() => of(new HttpResponse({ body: {} })))
    const url = resolveRuntimeStyleUrl(http, 'shell-styles')

    await expect(url).resolves.toBe('./shell-styles.css')
  })

  it('fetches the resolved stylesheet as text', async () => {
    const http = createHttpClient((request) =>
      of(
        new HttpResponse({
          body:
            request.url === './style-manifest.json'
              ? { 'shell-styles': 'shell-styles.123abc.css' }
              : '.icon { src: url(fonts/icon.woff2); }'
        })
      )
    )
    const css = fetchRuntimeStyle(http, 'shell-styles')

    await expect(css).resolves.toContain('url(http://localhost/fonts/icon.woff2)')
  })

  it('propagates stylesheet request errors', async () => {
    const http = createHttpClient((request) =>
      request.url === './style-manifest.json'
        ? of(new HttpResponse({ body: { 'shell-styles': 'shell-styles.123abc.css' } }))
        : throwError(() => new Error('CSS unavailable'))
    )
    const css = fetchRuntimeStyle(http, 'shell-styles')

    await expect(css).rejects.toThrow('CSS unavailable')
  })

  it('makes relative font URLs absolute against the deployment and stylesheet locations', () => {
    document.head.innerHTML = '<base href="/onecx-shell/">'

    const css =
      '.icon { src: url( "media/primeicons.woff2" ) format("woff2"); } .other { src: url(\'media/other.woff2\'); }'

    const result = resolveRelativeCssUrls(css, './portal-layout-styles.123.css')

    expect(result).toContain('url("http://localhost/onecx-shell/media/primeicons.woff2")')
    expect(result).toContain("url('http://localhost/onecx-shell/media/other.woff2')")
  })

  it('uses the document URL when no base element is present', () => {
    const css = '.icon { src: url(fonts/icon.woff2); }'

    expect(resolveRelativeCssUrls(css, './styles.css')).toContain('url(http://localhost/fonts/icon.woff2)')
  })

  it('preserves empty, absolute, root-relative, fragment, and data URLs', () => {
    const css =
      'a{src:url()}b{src:url(/fonts/icon.woff2)}c{src:url(#icon)}d{src:url(data:font/woff2;base64,abc)}e{src:url(https://cdn.example.com/icon.woff2)}'

    expect(resolveRelativeCssUrls(css, './styles.css')).toBe(css)
  })

  it('preserves malformed CSS URLs', () => {
    const css = 'a{src:url("broken.woff2)} b{src:url(unclosed'

    expect(resolveRelativeCssUrls(css, './styles.css')).toBe(css)
  })

  it('preserves text without URL functions', () => {
    expect(resolveRelativeCssUrls('body { color: red; }', './styles.css')).toBe('body { color: red; }')
  })

  it('resolves a URL that ends the stylesheet', () => {
    expect(resolveRelativeCssUrls('url(font.woff2)', './styles.css')).toBe('url(http://localhost/font.woff2)')
  })

  it('preserves URL values containing quote characters', () => {
    const css = `url("font'family.woff2") url(unquoted"font.woff2)`

    expect(resolveRelativeCssUrls(css, './styles.css')).toBe(css)
  })
})

function createHttpClient(respond: (request: HttpRequest<unknown>) => Observable<HttpEvent<unknown>>): HttpClient {
  const handler: HttpHandler = { handle: (request) => respond(request) }
  return new HttpClient(handler)
}
