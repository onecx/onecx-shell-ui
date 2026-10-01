import { dataStyleIdKey } from '@onecx/angular-utils'
import { getOnecxTriggerElement, initializeOnecxTriggerElementListener } from './onecx-trigger-element.utils'

describe('OneCX trigger element utilities', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    globalThis.onecxTriggerElement = null
  })

  it('tracks hover and focus targets', () => {
    const addListener = jest.spyOn(document, 'addEventListener')
    initializeOnecxTriggerElementListener()
    const hovered = document.createElement('button')
    const focused = document.createElement('input')
    const mouseover = addListener.mock.calls.find(([type]) => type === 'mouseover')?.[1]
    const focusin = addListener.mock.calls.find(([type]) => type === 'focusin')?.[1]

    if (typeof mouseover !== 'function' || typeof focusin !== 'function') {
      throw new Error('Trigger event listeners were not registered')
    }
    mouseover.call(document, { target: hovered } as unknown as Event)
    focusin.call(document, { target: focused } as unknown as Event)

    expect(globalThis.onecxTriggerElement).toBe(focused)
    expect(getOnecxTriggerElement()).toBe(focused)
  })

  it('returns null with a warning if the body container is absent', () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation()

    expect(getOnecxTriggerElement()).toBeNull()
    expect(warning).toHaveBeenCalledWith(
      'OneCX Trigger Element is null, will fallback to app trigger element as content source.'
    )
    expect(warning).toHaveBeenCalledWith('OneCX Body Element not found. Could not create fallback trigger element.')
    warning.mockRestore()
  })

  it('returns null if the body contains no styled app and uses the first styled app otherwise', () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation()
    const body = document.createElement('div')
    body.className = 'onecx-body'
    document.body.appendChild(body)

    expect(getOnecxTriggerElement()).toBeNull()
    expect(warning).toHaveBeenCalledWith(
      'No element with data-style-id found inside OneCX Body. Could not create fallback trigger element.'
    )

    const app = document.createElement('div')
    app.dataset[dataStyleIdKey] = 'app'
    body.appendChild(app)
    expect(getOnecxTriggerElement()).toBe(app)
    warning.mockRestore()
  })
})
