import { HttpClient } from '@angular/common/http'
import { dataDynamicPortalLayoutStylesKey, dataPortalLayoutStylesKey } from '@onecx/angular-utils'
jest.mock('@onecx/angular-utils', () => {
  const actual = jest.requireActual('@onecx/angular-utils')
  return { ...actual, isCssScopeRuleSupported: jest.fn() }
})
import { isCssScopeRuleSupported } from '@onecx/angular-utils'
import { of } from 'rxjs'
import { fetchPortalLayoutStyles, loadPortalLayoutStyles } from './legacy-style.utils'
import { fetchShellStyles, loadShellStyles } from './shell-styles.utils'

describe('shell and portal stylesheet loaders', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    jest.restoreAllMocks()
  })

  it('fetches both stylesheet resources as text', async () => {
    const request = jest.fn(() => of('body { color: red; }'))
    const http = { request } as unknown as HttpClient

    await expect(fetchShellStyles(http)).resolves.toContain('color: red')
    await expect(fetchPortalLayoutStyles(http)).resolves.toContain('color: red')

    expect(request).toHaveBeenNthCalledWith(1, 'get', './shell-styles.css', { responseType: 'text' })
    expect(request).toHaveBeenNthCalledWith(2, 'get', './portal-layout-styles.css', { responseType: 'text' })
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

  it('loads both portal layout stylesheets with and without native scope support', () => {
    const supported = jest.mocked(isCssScopeRuleSupported)
    supported.mockReturnValue(true)
    loadPortalLayoutStyles(':root { --layout: 1; }')
    const scopedStyles = Array.from(document.head.querySelectorAll('style'))
    expect(scopedStyles).toHaveLength(2)
    expect(scopedStyles[0].dataset[dataPortalLayoutStylesKey]).toBe('')
    expect(scopedStyles[1].dataset[dataDynamicPortalLayoutStylesKey]).toBe('')
    expect(scopedStyles.every((style) => style.textContent?.includes('@scope'))).toBe(true)

    document.head.innerHTML = ''
    supported.mockReturnValue(false)
    loadPortalLayoutStyles(':root { --layout: 2; }')
    const fallbackStyles = Array.from(document.head.querySelectorAll('style')) as (HTMLStyleElement & {
      onecxOriginalCss?: string
    })[]
    expect(fallbackStyles).toHaveLength(2)
    expect(fallbackStyles.every((style) => style.textContent?.includes('@supports'))).toBe(true)
    expect(fallbackStyles.map((style) => style.onecxOriginalCss)).toEqual([
      ':root { --layout: 2; }',
      ':root { --layout: 2; }'
    ])
  })
})
