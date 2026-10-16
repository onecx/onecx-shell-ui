import { dataStyleIdAttribute } from '@onecx/angular-utils'
import { isCssScopeRuleSupported } from '@onecx/angular-utils'
import { replaceRootAndHtmlWithScope } from '@onecx/angular-utils/style'

import { MARKED_AS_WRAPPED, MARKED_FOR_WRAPPING } from './shared-styles-host-overwrites.utils'
import { updateRequiredWrappingStyles } from './update-required-wrapping-styles.utils'

jest.mock('@onecx/angular-utils', () => {
  const actual = jest.requireActual('@onecx/angular-utils')
  return { ...actual, isCssScopeRuleSupported: jest.fn() }
})
jest.mock('@onecx/angular-utils/style', () => {
  const actual = jest.requireActual('@onecx/angular-utils/style')
  return { ...actual, replaceRootAndHtmlWithScope: jest.fn() }
})

describe('updateRequiredWrappingStyles', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    jest.restoreAllMocks()
  })

  it('ignores non-style elements and unmarked styles', () => {
    const div = document.createElement('div')
    const style = document.createElement('style')
    style.textContent = 'body {}'

    updateRequiredWrappingStyles([{ addedNodes: [div, style] } as unknown as MutationRecord])

    expect(style.dataset[MARKED_FOR_WRAPPING]).toBeUndefined()
  })

  it('marks empty and already wrapped styles', () => {
    const empty = document.createElement('style')
    empty.dataset[MARKED_FOR_WRAPPING] = 'app'
    const angularStyle = document.createElement('style')
    angularStyle.dataset[MARKED_FOR_WRAPPING] = 'app'
    angularStyle.textContent = '[_nghost-app] {}'
    const alreadyMarked = document.createElement('style')
    alreadyMarked.dataset[MARKED_FOR_WRAPPING] = 'app'
    alreadyMarked.dataset[MARKED_AS_WRAPPED] = ''
    alreadyMarked.textContent = 'body {}'

    updateRequiredWrappingStyles([{ addedNodes: [empty, angularStyle, alreadyMarked] } as unknown as MutationRecord])

    expect(empty.dataset[MARKED_AS_WRAPPED]).toBe('')
    expect(angularStyle.dataset[MARKED_AS_WRAPPED]).toBe('')
    expect(alreadyMarked.dataset[MARKED_FOR_WRAPPING]).toBeUndefined()
  })

  it('marks a style when its wrapping marker is removed before processing', () => {
    const style = document.createElement('style')
    style.textContent = 'body {}'
    let markerReads = 0
    const dataset = {} as DOMStringMap
    Object.defineProperty(dataset, MARKED_FOR_WRAPPING, {
      configurable: true,
      get: () => (++markerReads === 1 ? 'app' : '')
    })
    Object.defineProperty(style, 'dataset', { configurable: true, value: dataset })

    updateRequiredWrappingStyles([{ addedNodes: [style] } as unknown as MutationRecord])

    expect(markerReads).toBe(2)
    expect(style.dataset[MARKED_AS_WRAPPED]).toBe('')
  })

  it('wraps unscoped styles when native scope rules are supported', () => {
    jest.mocked(isCssScopeRuleSupported).mockReturnValue(true)
    jest.mocked(replaceRootAndHtmlWithScope).mockReturnValue('scoped CSS')
    const style = document.createElement('style')
    style.dataset[MARKED_FOR_WRAPPING] = 'app'
    style.dataset['source'] = 'test'
    style.textContent = 'html, :root { color: red; }'
    document.head.appendChild(style)

    updateRequiredWrappingStyles([{ addedNodes: [style] } as unknown as MutationRecord])

    const wrapped = document.head.querySelector('style') as HTMLStyleElement
    expect(wrapped).not.toBe(style)
    expect(wrapped.textContent).toContain(`@scope([${dataStyleIdAttribute}="app"]`)
    expect(wrapped.textContent).toContain('scoped CSS')
    expect(wrapped.dataset[MARKED_FOR_WRAPPING]).toBeUndefined()
    expect(wrapped.dataset[MARKED_AS_WRAPPED]).toBe('')
    expect(wrapped.dataset['source']).toBe('test')
  })

  it('wraps unscoped styles with a supports fallback when native scopes are unavailable', () => {
    jest.mocked(isCssScopeRuleSupported).mockReturnValue(false)
    jest.mocked(replaceRootAndHtmlWithScope).mockReturnValue('fallback CSS')
    const style = document.createElement('style')
    style.dataset[MARKED_FOR_WRAPPING] = 'app'
    style.textContent = 'html { color: blue; }'
    document.head.appendChild(style)

    updateRequiredWrappingStyles([{ addedNodes: [style] } as unknown as MutationRecord])

    const wrapped = document.head.querySelector('style') as HTMLStyleElement & {
      onecxOriginalCss?: string
    }
    expect(wrapped.textContent).toContain('@supports')
    expect(wrapped.textContent).toContain('fallback CSS')
    expect(wrapped.onecxOriginalCss).toBe('html { color: blue; }')
  })

  it('recognizes an already scoped style for both browser scope modes', () => {
    const supported = jest.mocked(isCssScopeRuleSupported)
    const native = document.createElement('style')
    native.dataset[MARKED_FOR_WRAPPING] = 'app'
    native.textContent = '@scope([data-style-id="app"]) {}'
    supported.mockReturnValue(true)
    updateRequiredWrappingStyles([{ addedNodes: [native] } as unknown as MutationRecord])
    expect(native.dataset[MARKED_AS_WRAPPED]).toBe('')

    const fallback = document.createElement('style')
    fallback.dataset[MARKED_FOR_WRAPPING] = 'app'
    fallback.textContent = '@supports(@scope([data-style-id="app"]) {})'
    supported.mockReturnValue(false)
    updateRequiredWrappingStyles([{ addedNodes: [fallback] } as unknown as MutationRecord])
    expect(fallback.dataset[MARKED_AS_WRAPPED]).toBe('')
  })
})
