import { HttpClient } from '@angular/common/http'
import { of, throwError } from 'rxjs'

import { fetchRuntimeStyle, resolveRelativeCssUrls, resolveRuntimeStyleUrl } from './runtime-style.utils'

describe('runtime style utils', () => {
  it('resolves a hashed stylesheet from the manifest', async () => {
    const http = {
      request: jest.fn(() => of({ 'shell-styles': 'shell-styles.123abc.css' }))
    } as unknown as HttpClient

    await expect(resolveRuntimeStyleUrl(http, 'shell-styles')).resolves.toBe('./shell-styles.123abc.css')
  })

  it('falls back to the unhashed stylesheet when the manifest is unavailable', async () => {
    const http = {
      request: jest.fn(() => throwError(() => new Error('manifest not found')))
    } as unknown as HttpClient

    await expect(resolveRuntimeStyleUrl(http, 'shell-styles')).resolves.toBe('./shell-styles.css')
  })

  it('fetches the resolved stylesheet as text', async () => {
    const request = jest.fn((method: string, url: string) =>
      of(url === './style-manifest.json' ? { 'shell-styles': 'shell-styles.123abc.css' } : 'body {}')
    )
    const http = { request } as unknown as HttpClient

    await expect(fetchRuntimeStyle(http, 'shell-styles')).resolves.toBe('body {}')
  })

  it('makes relative font URLs absolute against the deployment and stylesheet locations', () => {
    document.head.innerHTML = '<base href="/onecx-shell/">'

    const css = '.icon { src: url( "media/primeicons.woff2" ) format("woff2"); }'

    expect(resolveRelativeCssUrls(css, './portal-layout-styles.123.css')).toContain(
      'url("http://localhost/onecx-shell/media/primeicons.woff2")'
    )
  })
})
