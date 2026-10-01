import { POLYFILL_SCOPE_MODE } from '@onecx/angular-integration-interface'
import { dataOnecxDynamicContainerKey, dataStyleIdKey } from '@onecx/angular-utils'
jest.mock('@onecx/angular-utils', () => {
  const actual = jest.requireActual('@onecx/angular-utils')
  return { ...actual, isCssScopeRuleSupported: jest.fn() }
})
import { isCssScopeRuleSupported } from '@onecx/angular-utils'
import * as polyfill from 'src/scope-polyfill/polyfill'
import { ensureBodyChangesIncludeStyleData } from './body-overwrites.utils'

describe('body style data overwrites', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    globalThis.onecxTriggerElement = null
    jest.restoreAllMocks()
  })

  afterEach(() => {
    Reflect.deleteProperty(document.body, 'appendChild')
    Reflect.deleteProperty(document.body, 'removeChild')
  })

  it('wraps body children with inherited style data and removes their wrapper', () => {
    const trigger = document.createElement('div')
    trigger.dataset[dataStyleIdKey] = 'shell|app'
    globalThis.onecxTriggerElement = trigger
    ensureBodyChangesIncludeStyleData(undefined)
    const child = document.createElement('main')

    document.body.appendChild(child)

    const wrapper = document.body.firstElementChild as HTMLElement
    expect(wrapper.dataset[dataStyleIdKey]).toBe('shell|app')
    expect(wrapper.firstElementChild).toBe(child)
    expect(child.dataset[dataStyleIdKey]).toBeUndefined()
    document.body.removeChild(child)
    expect(document.body.firstElementChild).toBeNull()
  })

  it('leaves text and blacklisted body children unwrapped', () => {
    ensureBodyChangesIncludeStyleData(undefined)
    const text = document.createTextNode('text')
    const hidden = document.createElement('div')
    hidden.classList.add('cdk-visually-hidden')
    const dynamic = document.createElement('div')
    dynamic.dataset[dataOnecxDynamicContainerKey] = ''

    document.body.appendChild(text)
    document.body.appendChild(hidden)
    document.body.appendChild(dynamic)

    expect(document.body.childNodes).toContain(text)
    expect(hidden.parentElement).toBe(document.body)
    expect(dynamic.parentElement).toBe(document.body)
    document.body.removeChild(text)
    expect(text.parentNode).toBeNull()
  })

  it('wraps an unstyled child without inheriting style data when no trigger exists', () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation()
    ensureBodyChangesIncludeStyleData(undefined)
    const child = document.createElement('main')

    const wrapper = document.body.appendChild(child) as HTMLElement

    expect(wrapper).not.toBe(child)
    expect(wrapper.dataset[dataStyleIdKey]).toBeUndefined()
    expect(child.parentElement).toBe(wrapper)
    expect(warning).toHaveBeenCalled()
    document.body.removeChild(child)
    warning.mockRestore()
  })

  it('moves child style data to Angular Material overlays', () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation()
    ensureBodyChangesIncludeStyleData(undefined)
    const overlay = document.createElement('div')
    overlay.classList.add('cdk-overlay-container')
    document.body.appendChild(overlay)
    const child = document.createElement('button')
    child.dataset[dataStyleIdKey] = 'overlay|app'

    overlay.appendChild(child)

    expect(overlay.dataset[dataStyleIdKey]).toBe('overlay|app')
    expect(child.dataset[dataStyleIdKey]).toBeUndefined()
    overlay.removeChild(child)

    const trigger = document.createElement('button')
    trigger.dataset[dataStyleIdKey] = 'trigger|app'
    globalThis.onecxTriggerElement = trigger
    const unstyledChild = document.createElement('button')
    overlay.appendChild(unstyledChild)
    expect(overlay.dataset[dataStyleIdKey]).toBe('trigger|app')
    expect(unstyledChild.dataset[dataStyleIdKey]).toBeUndefined()
    expect(overlay.childElementCount).toBe(1)
    overlay.removeChild(unstyledChild)

    globalThis.onecxTriggerElement = null
    const childWithoutStyleData = document.createElement('button')
    overlay.appendChild(childWithoutStyleData)
    expect(overlay.dataset[dataStyleIdKey]).toBe('trigger|app')
    expect(childWithoutStyleData.dataset[dataStyleIdKey]).toBeUndefined()
    overlay.removeChild(childWithoutStyleData)

    const text = document.createTextNode('overlay text')
    overlay.appendChild(text)
    expect(overlay.childNodes).toContain(text)
    overlay.removeChild(text)
    expect(overlay.childElementCount).toBe(0)
    warning.mockRestore()
  })

  it('updates precision polyfill styles only when native scope rules are unavailable', () => {
    const supported = jest.mocked(isCssScopeRuleSupported)
    const update = jest.spyOn(polyfill, 'updateStyleSheets').mockImplementation()
    supported.mockReturnValue(false)
    ensureBodyChangesIncludeStyleData(POLYFILL_SCOPE_MODE.PRECISION)
    document.body.appendChild(document.createElement('div'))
    expect(update).toHaveBeenCalledTimes(1)

    Reflect.deleteProperty(document.body, 'appendChild')
    Reflect.deleteProperty(document.body, 'removeChild')
    update.mockClear()
    supported.mockReturnValue(true)
    ensureBodyChangesIncludeStyleData(POLYFILL_SCOPE_MODE.PRECISION)
    document.body.appendChild(document.createElement('div'))
    expect(update).not.toHaveBeenCalled()
  })
})
