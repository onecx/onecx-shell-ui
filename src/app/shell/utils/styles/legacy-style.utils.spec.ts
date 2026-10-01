import { HttpClient } from '@angular/common/http'
import { dataDynamicPortalLayoutStylesKey, dataPortalLayoutStylesKey } from '@onecx/angular-utils'
import { isCssScopeRuleSupported } from '@onecx/angular-utils'
import { of } from 'rxjs'
import { fetchPortalLayoutStyles, loadPortalLayoutStyles } from './legacy-style.utils'

jest.mock('@onecx/angular-utils', () => {
  const actual = jest.requireActual('@onecx/angular-utils')
  return { ...actual, isCssScopeRuleSupported: jest.fn() }
})

describe('legacy style utils', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    jest.restoreAllMocks()
  })

  it('fetches portal layout stylesheet as text', async () => {
    const request = jest.fn(() => of('body { color: red; }'))
    const http = { request } as unknown as HttpClient

    await expect(fetchPortalLayoutStyles(http)).resolves.toContain('color: red')
    expect(request).toHaveBeenCalledWith('get', './portal-layout-styles.css', { responseType: 'text' })
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
