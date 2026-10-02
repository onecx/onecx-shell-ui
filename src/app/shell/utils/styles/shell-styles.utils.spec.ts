import { HttpClient } from '@angular/common/http'
import { of } from 'rxjs'

import { isCssScopeRuleSupported } from '@onecx/angular-utils'

import { fetchShellStyles, loadShellStyles } from './shell-styles.utils'

jest.mock('@onecx/angular-utils', () => {
  const actual = jest.requireActual('@onecx/angular-utils')
  return { ...actual, isCssScopeRuleSupported: jest.fn() }
})

describe('shell styles utils', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    jest.restoreAllMocks()
  })

  it('fetches shell stylesheet as text', async () => {
    const request = jest.fn(() => of('body { color: red; }'))
    const http = { request } as unknown as HttpClient

    await expect(fetchShellStyles(http)).resolves.toContain('color: red')
    expect(request).toHaveBeenCalledWith('get', './shell-styles.css', { responseType: 'text' })
  })

  it('loads shell styles with native scope support or a supports fallback', () => {
    const supported = jest.mocked(isCssScopeRuleSupported)
    supported.mockReturnValue(true)
    loadShellStyles(':root { --color: red; }')
    const scoped = document.head.querySelector('style') as HTMLStyleElement & {
      onecx?: { markers: string[] }
    }
    expect(scoped.textContent).toContain('@scope')
    expect(scoped.onecx?.markers).toContain('shellStylesStyles')

    supported.mockReturnValue(false)
    loadShellStyles(':root { --color: blue; }')
    const fallback = document.head.querySelectorAll('style')[1] as HTMLStyleElement & {
      onecxOriginalCss?: string
    }
    expect(fallback.textContent).toContain('@supports')
    expect(fallback.onecxOriginalCss).toBe(':root { --color: blue; }')
  })
})
